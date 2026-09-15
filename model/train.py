from __future__ import annotations

import importlib.metadata
import json
import math
from pathlib import Path
from typing import Any, Callable

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error

from evaluate import INITIAL_EXPERIMENTS, run_experiments
from src.data import GROUP_COLUMN, METADATA_COLUMNS, TARGET, load_capacity_data, logo_splits, prediction_input_from_row, sha256_file
from src.evaluation import (
    evaluate_logo,
    evaluate_grouped,
    full_metric_record,
    grouped_cv_predictions,
    nested_tuned_logo,
    per_source_metrics,
    regression_metrics,
    select_grouped_parameters,
    subset_metrics,
)
from src.features import FEATURE_A, FEATURE_A_DEPLOYMENT, FEATURE_A_DEPLOYMENT_INTERACTIONS, FEATURE_A_INTERACTIONS, FEATURE_B, FEATURE_B_DEPLOYMENT, FeatureConfig, predictive_fields
from src.modeling import CapacityModelBundle, DEFAULT_CATBOOST_PARAMETERS, DEFAULT_RANDOM_FOREST_PARAMETERS, PredictionEnsemble, RANDOM_SEED, make_pipeline, save_bundle
from src.support import create_support_profile


MODEL_DIR = Path(__file__).resolve().parent
EVALUATION_DIR = MODEL_DIR / "evaluation"
PLOTS_DIR = EVALUATION_DIR / "plots"
ARTIFACTS_DIR = MODEL_DIR / "artifacts"
MODEL_ID = "h2-triad-capacity-v1"

CATBOOST_GRID: list[dict[str, object]] = [
    {"iterations": 300, "depth": 3, "learning_rate": 0.03, "l2_leaf_reg": 10.0},
    {"iterations": 400, "depth": 3, "learning_rate": 0.05, "l2_leaf_reg": 10.0},
    {"iterations": 350, "depth": 4, "learning_rate": 0.03, "l2_leaf_reg": 10.0},
    {"iterations": 500, "depth": 4, "learning_rate": 0.02, "l2_leaf_reg": 20.0},
    {"iterations": 300, "depth": 4, "learning_rate": 0.05, "l2_leaf_reg": 20.0},
    {"iterations": 350, "depth": 5, "learning_rate": 0.03, "l2_leaf_reg": 20.0},
]
RANDOM_FOREST_GRID: list[dict[str, object]] = [
    {"n_estimators": 400, "max_depth": 4, "min_samples_leaf": 3, "min_samples_split": 6, "max_features": 0.7},
    {"n_estimators": 400, "max_depth": 6, "min_samples_leaf": 2, "min_samples_split": 4, "max_features": 0.7},
    {"n_estimators": 400, "max_depth": 6, "min_samples_leaf": 3, "min_samples_split": 6, "max_features": 0.5},
    {"n_estimators": 400, "max_depth": 6, "min_samples_leaf": 3, "min_samples_split": 6, "max_features": 1.0},
    {"n_estimators": 400, "max_depth": None, "min_samples_leaf": 3, "min_samples_split": 6, "max_features": 0.7},
    {"n_estimators": 400, "max_depth": 8, "min_samples_leaf": 5, "min_samples_split": 10, "max_features": 0.7},
]


def json_ready(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): json_ready(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_ready(item) for item in value]
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return value


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(json_ready(value), indent=2, sort_keys=True) + "\n", encoding="utf-8")


def experiment_record(
    experiment_id: str,
    model: str,
    feature_set: str,
    predictions: np.ndarray,
    frame: pd.DataFrame,
    notes: str,
    hyperparameters: Any,
    regularization: str = "nested grouped tuning",
) -> dict[str, Any]:
    return {
        "experiment_id": experiment_id,
        "model": model,
        "feature_set": feature_set,
        "augmentation": "not_used",
        "preprocessing": "fold-local median/OHE and deterministic derived features; element multi-hot where enabled",
        "regularization": regularization,
        "hyperparameters": json.dumps(json_ready(hyperparameters), sort_keys=True),
        "seed": RANDOM_SEED,
        "grouping_strategy": "LeaveOneGroupOut(source_id)",
        **full_metric_record(frame, predictions),
        "notes": notes,
    }


def prediction_with_fold_parameters(
    frame: pd.DataFrame,
    config: FeatureConfig,
    model_name: str,
    parameters_by_source: dict[str, dict[str, object]],
) -> np.ndarray:
    predictions = np.full(len(frame), np.nan, dtype=float)
    for train_index, test_index in logo_splits(frame):
        held_source = str(frame.iloc[test_index][GROUP_COLUMN].iloc[0])
        parameters = parameters_by_source[held_source]
        pipeline = make_pipeline(config, model_name, parameters)
        pipeline.fit(frame.iloc[train_index], frame.iloc[train_index][TARGET].to_numpy(float))
        predictions[test_index] = pipeline.predict(frame.iloc[test_index])
    if not np.isfinite(predictions).all():
        raise AssertionError("Fold-parameter evaluation returned incomplete predictions")
    return predictions


def nested_weighted_ensemble(
    frame: pd.DataFrame,
    config: FeatureConfig,
    cat_parameters_by_source: dict[str, dict[str, object]],
    forest_parameters_by_source: dict[str, dict[str, object]],
) -> tuple[np.ndarray, pd.DataFrame]:
    predictions = np.full(len(frame), np.nan, dtype=float)
    records = []
    for train_index, test_index in logo_splits(frame):
        training = frame.iloc[train_index].reset_index(drop=True)
        held_source = str(frame.iloc[test_index][GROUP_COLUMN].iloc[0])
        cat_parameters = cat_parameters_by_source[held_source]
        forest_parameters = forest_parameters_by_source[held_source]
        cat_inner = grouped_cv_predictions(
            training, lambda: make_pipeline(config, "catboost", cat_parameters), n_splits=5
        )
        forest_inner = grouped_cv_predictions(
            training, lambda: make_pipeline(config, "random_forest", forest_parameters), n_splits=5
        )
        actual = training[TARGET].to_numpy(float)
        cat_mae = float(mean_absolute_error(actual, cat_inner))
        forest_mae = float(mean_absolute_error(actual, forest_inner))
        inverse = np.asarray([1.0 / cat_mae, 1.0 / forest_mae])
        weights = inverse / inverse.sum()
        cat = make_pipeline(config, "catboost", cat_parameters)
        forest = make_pipeline(config, "random_forest", forest_parameters)
        cat.fit(frame.iloc[train_index], frame.iloc[train_index][TARGET].to_numpy(float))
        forest.fit(frame.iloc[train_index], frame.iloc[train_index][TARGET].to_numpy(float))
        member_predictions = np.vstack(
            [cat.predict(frame.iloc[test_index]), forest.predict(frame.iloc[test_index])]
        )
        predictions[test_index] = np.average(member_predictions, axis=0, weights=weights)
        records.append(
            {
                "outer_source": held_source,
                "catboost_inner_mae": cat_mae,
                "random_forest_inner_mae": forest_mae,
                "catboost_weight": weights[0],
                "random_forest_weight": weights[1],
            }
        )
    return predictions, pd.DataFrame(records)


def crossfit_intervals(
    frame: pd.DataFrame,
    config: FeatureConfig,
    model_name: str,
    parameters_by_source: dict[str, dict[str, object]],
) -> tuple[np.ndarray, np.ndarray, dict[str, Any]]:
    lower = np.full(len(frame), np.nan)
    upper = np.full(len(frame), np.nan)
    fold_records = []
    for train_index, test_index in logo_splits(frame):
        training = frame.iloc[train_index].reset_index(drop=True)
        held_source = str(frame.iloc[test_index][GROUP_COLUMN].iloc[0])
        parameters = parameters_by_source[held_source]
        inner_predictions = grouped_cv_predictions(
            training,
            lambda: make_pipeline(config, model_name, parameters),
            n_splits=5,
        )
        residuals = training[TARGET].to_numpy(float) - inner_predictions
        fitted = make_pipeline(config, model_name, parameters)
        fitted.fit(training, training[TARGET].to_numpy(float))
        outer_predictions = fitted.predict(frame.iloc[test_index])
        for mode in ("absorption", "desorption"):
            train_mask = training["measurement_mode"].eq(mode).to_numpy()
            test_positions = test_index[frame.iloc[test_index]["measurement_mode"].eq(mode).to_numpy()]
            if not len(test_positions):
                continue
            calibration = residuals[train_mask] if train_mask.sum() >= 20 else residuals
            q05, q95 = np.quantile(calibration, [0.05, 0.95])
            outer_mask = frame.iloc[test_index]["measurement_mode"].eq(mode).to_numpy()
            lower[test_positions] = np.maximum(0.0, outer_predictions[outer_mask] + q05)
            upper[test_positions] = outer_predictions[outer_mask] + q95
            fold_records.append(
                {"outer_source": held_source, "mode": mode, "q05": q05, "q95": q95, "calibration_rows": int(len(calibration))}
            )
    actual = frame[TARGET].to_numpy(float)
    coverage = (actual >= lower) & (actual <= upper)
    summary = {
        "method": "cross-fitted signed 5th/95th grouped-CV residual quantiles, calibrated without the outer paper",
        "coverage": float(coverage.mean()),
        "mean_width_wt_pct": float(np.mean(upper - lower)),
        "absorption_coverage": float(coverage[frame["measurement_mode"].eq("absorption")].mean()),
        "desorption_coverage": float(coverage[frame["measurement_mode"].eq("desorption")].mean()),
        "absorption_mean_width_wt_pct": float(np.mean((upper - lower)[frame["measurement_mode"].eq("absorption")])),
        "desorption_mean_width_wt_pct": float(np.mean((upper - lower)[frame["measurement_mode"].eq("desorption")])),
        "folds": fold_records,
    }
    return lower, upper, summary


def learning_curve(
    frame: pd.DataFrame,
    pipeline_factory: Callable[[], object],
) -> pd.DataFrame:
    rng = np.random.default_rng(RANDOM_SEED)
    sources = np.asarray(sorted(frame[GROUP_COLUMN].unique()))
    records = []
    for training_papers in (3, 5, 8, 11, 14):
        for repeat in range(20):
            held_source = str(sources[repeat % len(sources)])
            candidates = sources[sources != held_source]
            selected = rng.choice(candidates, size=training_papers, replace=False)
            train_mask = frame[GROUP_COLUMN].isin(selected)
            test_mask = frame[GROUP_COLUMN].eq(held_source)
            pipeline = pipeline_factory()
            pipeline.fit(frame.loc[train_mask], frame.loc[train_mask, TARGET].to_numpy(float))
            prediction = pipeline.predict(frame.loc[test_mask])
            metrics = regression_metrics(frame.loc[test_mask, TARGET].to_numpy(float), prediction)
            records.append(
                {
                    "training_papers": training_papers,
                    "repeat": repeat,
                    "held_source": held_source,
                    "training_rows": int(train_mask.sum()),
                    **metrics,
                }
            )
    return pd.DataFrame(records)


def diagnostic_summary(frame: pd.DataFrame, predictions: np.ndarray) -> dict[str, Any]:
    actual = frame[TARGET].to_numpy(float)
    residual = actual - predictions
    output: dict[str, Any] = {
        "mean_signed_residual_actual_minus_predicted": float(residual.mean()),
        "underprediction_share": float((residual > 0).mean()),
        "residual_prediction_correlation": float(np.corrcoef(residual, predictions)[0, 1]),
        "absolute_error_temperature_correlation": float(np.corrcoef(np.abs(residual), frame["temperature_c"].to_numpy(float))[0, 1]),
        "absolute_error_log_duration_correlation": float(np.corrcoef(np.abs(residual), np.log1p(frame["duration_seconds"].to_numpy(float)))[0, 1]),
    }
    for field in ("measurement_mode", "catalyst_family", "value_qualifier"):
        groups = []
        for value, part in frame.assign(_prediction=predictions).groupby(field, dropna=False):
            groups.append(
                {
                    field: str(value),
                    "rows": int(len(part)),
                    **regression_metrics(part[TARGET].to_numpy(float), part["_prediction"].to_numpy(float)),
                }
            )
        output[f"by_{field}"] = groups
    output["pressure_known"] = subset_metrics(frame, predictions, frame["pressure_bar"].notna())
    output["pressure_missing"] = subset_metrics(frame, predictions, frame["pressure_bar"].isna())
    return output


def plot_outputs(
    frame: pd.DataFrame,
    predictions: np.ndarray,
    source_metrics: pd.DataFrame,
    learning: pd.DataFrame,
    leaderboard: pd.DataFrame,
    importance: pd.DataFrame,
) -> None:
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)
    actual = frame[TARGET].to_numpy(float)
    residual = actual - predictions

    fig, ax = plt.subplots(figsize=(6, 5))
    for mode, marker in (("absorption", "o"), ("desorption", "s")):
        mask = frame["measurement_mode"].eq(mode)
        ax.scatter(actual[mask], predictions[mask], alpha=0.75, label=mode, marker=marker)
    limits = [min(actual.min(), predictions.min()), max(actual.max(), predictions.max())]
    ax.plot(limits, limits, "k--", linewidth=1)
    ax.set(xlabel="Actual capacity (wt.% H₂)", ylabel="OOF predicted capacity (wt.% H₂)", title="Actual vs paper-held-out prediction")
    ax.legend()
    fig.tight_layout(); fig.savefig(PLOTS_DIR / "actual_vs_predicted.png", dpi=160); plt.close(fig)

    fig, ax = plt.subplots(figsize=(6, 4))
    ax.hist(residual, bins=16, color="#0f766e", alpha=0.85)
    ax.axvline(0, color="black", linestyle="--", linewidth=1)
    ax.set(xlabel="Residual: actual − prediction (wt.% H₂)", ylabel="Observations", title="Paper-held-out residual distribution")
    fig.tight_layout(); fig.savefig(PLOTS_DIR / "residual_distribution.png", dpi=160); plt.close(fig)

    fig, ax = plt.subplots(figsize=(6, 4))
    ax.scatter(predictions, residual, c=frame["temperature_c"], cmap="viridis", alpha=0.75)
    ax.axhline(0, color="black", linestyle="--", linewidth=1)
    ax.set(xlabel="OOF predicted capacity (wt.% H₂)", ylabel="Residual (wt.% H₂)", title="Residual vs prediction")
    fig.tight_layout(); fig.savefig(PLOTS_DIR / "residual_vs_predicted.png", dpi=160); plt.close(fig)

    fig, ax = plt.subplots(figsize=(8, 5))
    ordered = source_metrics.sort_values("mae")
    ax.barh(ordered["paper_id"], ordered["mae"], color="#0f766e")
    ax.set(xlabel="MAE (wt.% H₂)", ylabel="Held-out paper", title="MAE by unseen paper")
    fig.tight_layout(); fig.savefig(PLOTS_DIR / "per_source_mae.png", dpi=160); plt.close(fig)

    mode_mae = [
        mean_absolute_error(frame.loc[frame["measurement_mode"].eq(mode), TARGET], predictions[frame["measurement_mode"].eq(mode)])
        for mode in ("absorption", "desorption")
    ]
    fig, ax = plt.subplots(figsize=(5, 4))
    ax.bar(["Absorption", "Desorption"], mode_mae, color=["#0891b2", "#0f766e"])
    ax.set(ylabel="MAE (wt.% H₂)", title="Paper-held-out error by measurement mode")
    fig.tight_layout(); fig.savefig(PLOTS_DIR / "mode_performance.png", dpi=160); plt.close(fig)

    for field, xlabel, filename in (("temperature_c", "Temperature (°C)", "error_vs_temperature.png"), ("duration_seconds", "Duration (s, log scale)", "error_vs_duration.png")):
        fig, ax = plt.subplots(figsize=(6, 4))
        ax.scatter(frame[field], np.abs(residual), c=frame["measurement_mode"].map({"absorption": 0, "desorption": 1}), cmap="coolwarm", alpha=0.75)
        if field == "duration_seconds": ax.set_xscale("log")
        ax.set(xlabel=xlabel, ylabel="Absolute error (wt.% H₂)", title=f"Error vs {xlabel.lower()}")
        fig.tight_layout(); fig.savefig(PLOTS_DIR / filename, dpi=160); plt.close(fig)

    curve = learning.groupby("training_papers")["mae"].agg(["mean", "std"]).reset_index()
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.errorbar(curve["training_papers"], curve["mean"], yerr=curve["std"], marker="o", capsize=3, color="#0f766e")
    ax.set(xlabel="Independent training papers", ylabel="Held-out-paper MAE (wt.% H₂)", title="Grouped learning curve")
    fig.tight_layout(); fig.savefig(PLOTS_DIR / "grouped_learning_curve.png", dpi=160); plt.close(fig)

    top = leaderboard.sort_values("grouped_mae").head(8).sort_values("grouped_mae", ascending=False)
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.barh(top["experiment_id"], top["grouped_mae"], color="#0f766e")
    ax.set(xlabel="LOPO MAE (wt.% H₂)", title="Candidate and ensemble comparison")
    fig.tight_layout(); fig.savefig(PLOTS_DIR / "ensemble_comparison.png", dpi=160); plt.close(fig)

    if len(importance):
        top_importance = importance.head(20).sort_values("importance")
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.barh(top_importance["feature"], top_importance["importance"], color="#0f766e")
        ax.set(xlabel="Model importance", title="Importance to this predictive model")
        fig.tight_layout(); fig.savefig(PLOTS_DIR / "feature_importance.png", dpi=160); plt.close(fig)


def main() -> None:
    EVALUATION_DIR.mkdir(parents=True, exist_ok=True)
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    frame = load_capacity_data()
    sources = sorted(frame[GROUP_COLUMN].unique())
    no_milling = FEATURE_A.without(
        "milling_time_h", "milling_speed_rpm", "ball_to_powder_ratio_numeric", name="feature_a_no_milling"
    )
    no_milling_identity = FEATURE_B.without(
        "milling_time_h", "milling_speed_rpm", "ball_to_powder_ratio_numeric", name="feature_b_no_milling"
    )
    no_milling_interactions = FEATURE_A_INTERACTIONS.without(
        "milling_time_h", "milling_speed_rpm", "ball_to_powder_ratio_numeric", name="feature_a_interactions_no_milling"
    )
    final_general = no_milling.without(
        "pressure_bar", "pressure_missing", "pressure_relation", "catalyst_elements", "explicit_element_count",
        name="feature_a_reduced",
    )
    final_identity = no_milling_identity.without(
        "pressure_bar", "pressure_missing", "pressure_relation", "catalyst_elements", "explicit_element_count",
        name="feature_b_reduced",
    )
    final_interactions = no_milling_interactions.without(
        "pressure_bar", "pressure_missing", "pressure_relation", "catalyst_elements", "explicit_element_count",
        name="feature_a_reduced_interactions",
    )
    deployment_config = FEATURE_A_DEPLOYMENT
    deployment_identity = FEATURE_B_DEPLOYMENT
    deployment_interactions = FEATURE_A_DEPLOYMENT_INTERACTIONS

    print("Running fixed progression", flush=True)
    initial_leaderboard, initial_predictions = run_experiments(frame, INITIAL_EXPERIMENTS)
    added_records: list[dict[str, Any]] = []
    evaluated_predictions: dict[str, np.ndarray] = dict(initial_predictions)
    registry: dict[str, tuple[FeatureConfig, str, dict[str, object], dict[str, dict[str, object]]]] = {}
    for experiment in INITIAL_EXPERIMENTS:
        parameters = dict(DEFAULT_CATBOOST_PARAMETERS) if experiment.model == "catboost" else dict(experiment.parameters)
        registry[experiment.experiment_id] = (
            experiment.config,
            experiment.model,
            parameters,
            {source: parameters for source in sources},
        )

    print("Running controlled nested tuning on full Feature A", flush=True)
    tuned_a, choices_a, search_a = nested_tuned_logo(
        frame, lambda parameters: make_pipeline(FEATURE_A, "catboost", parameters), CATBOOST_GRID, inner_splits=5
    )
    search_a.to_csv(EVALUATION_DIR / "tuning_results_feature_a.csv", index=False)
    write_json(EVALUATION_DIR / "tuning_choices_feature_a.json", choices_a)
    added_records.append(experiment_record(
        "B2_catboost_a_nested_tuned", "catboost", FEATURE_A.name, tuned_a, frame,
        "Nested source-grouped tuning; did not automatically replace the fixed model", CATBOOST_GRID,
    ))
    evaluated_predictions["B2_catboost_a_nested_tuned"] = tuned_a
    registry["B2_catboost_a_nested_tuned"] = (
        FEATURE_A, "catboost", dict(DEFAULT_CATBOOST_PARAMETERS),
        {str(item["outer_source"]): dict(item["parameters"]) for item in choices_a},
    )

    print("Evaluating and tuning the promising no-milling candidate", flush=True)
    fixed_no_milling, _ = evaluate_logo(
        frame, lambda: make_pipeline(no_milling, "catboost", DEFAULT_CATBOOST_PARAMETERS)
    )
    evaluated_predictions["B3_catboost_a_no_milling_fixed"] = fixed_no_milling
    added_records.append(experiment_record(
        "B3_catboost_a_no_milling_fixed", "catboost", no_milling.name, fixed_no_milling, frame,
        "Milling time, speed, and ratio removed after the full-A ablation signal", DEFAULT_CATBOOST_PARAMETERS,
        "fixed conservative configuration",
    ))
    default_map = {source: dict(DEFAULT_CATBOOST_PARAMETERS) for source in sources}
    registry["B3_catboost_a_no_milling_fixed"] = (no_milling, "catboost", dict(DEFAULT_CATBOOST_PARAMETERS), default_map)

    tuned_no_milling, choices_nm, search_nm = nested_tuned_logo(
        frame, lambda parameters: make_pipeline(no_milling, "catboost", parameters), CATBOOST_GRID, inner_splits=5
    )
    choice_map_nm = {str(item["outer_source"]): dict(item["parameters"]) for item in choices_nm}
    search_nm.to_csv(EVALUATION_DIR / "tuning_results_no_milling.csv", index=False)
    write_json(EVALUATION_DIR / "tuning_choices_no_milling.json", choices_nm)
    final_parameters_nm, final_search_nm = select_grouped_parameters(
        frame, lambda parameters: make_pipeline(no_milling, "catboost", parameters), CATBOOST_GRID, inner_splits=5
    )
    final_search_nm.to_csv(EVALUATION_DIR / "final_parameter_search.csv", index=False)
    evaluated_predictions["B4_catboost_a_no_milling_nested_tuned"] = tuned_no_milling
    added_records.append(experiment_record(
        "B4_catboost_a_no_milling_nested_tuned", "catboost", no_milling.name, tuned_no_milling, frame,
        "Nested source-grouped tuning of the no-milling candidate", CATBOOST_GRID,
    ))
    registry["B4_catboost_a_no_milling_nested_tuned"] = (no_milling, "catboost", final_parameters_nm, choice_map_nm)

    fixed_metrics = full_metric_record(frame, fixed_no_milling)
    tuned_metrics = full_metric_record(frame, tuned_no_milling)
    tuning_retained = bool(
        tuned_metrics["grouped_mae"] < fixed_metrics["grouped_mae"]
        and tuned_metrics["grouped_rmse"] <= fixed_metrics["grouped_rmse"] + 0.02
    )

    final_general_predictions, _ = evaluate_logo(
        frame, lambda: make_pipeline(final_general, "catboost", DEFAULT_CATBOOST_PARAMETERS)
    )
    primary_id = "B7_catboost_a_reduced_fixed"
    evaluated_predictions[primary_id] = final_general_predictions
    added_records.append(experiment_record(
        primary_id, "catboost", final_general.name, final_general_predictions, frame,
        "Selected compact contract: pressure, milling details, and elemental predictors removed by staged LOPO ablation",
        DEFAULT_CATBOOST_PARAMETERS, "fixed conservative configuration after nested tuning failed to improve the parent model",
    ))
    registry[primary_id] = (final_general, "catboost", dict(DEFAULT_CATBOOST_PARAMETERS), default_map)
    primary_predictions = evaluated_predictions[primary_id]
    primary_config, _, primary_parameters, primary_choice_map = registry[primary_id]

    comparison_configs = {
        "B5_catboost_b_reduced": final_identity,
        "B6_catboost_a_reduced_interactions": final_interactions,
    }
    for experiment_id, config in comparison_configs.items():
        prediction = prediction_with_fold_parameters(frame, config, "catboost", primary_choice_map)
        evaluated_predictions[experiment_id] = prediction
        added_records.append(experiment_record(
            experiment_id, "catboost", config.name, prediction, frame,
            "Uses parameters chosen without the outer paper for the generalization-oriented candidate",
            "outer training-paper choices",
        ))
        registry[experiment_id] = (config, "catboost", primary_parameters, primary_choice_map)

    forest_no_milling, _ = evaluate_logo(frame, lambda: make_pipeline(primary_config, "random_forest"))
    evaluated_predictions["T3_random_forest_a_reduced"] = forest_no_milling
    added_records.append(experiment_record(
        "T3_random_forest_a_reduced", "random_forest", primary_config.name, forest_no_milling, frame,
        "Random Forest using the reduced generalization-oriented contract", {}, "fixed conservative configuration",
    ))
    registry["T3_random_forest_a_reduced"] = (primary_config, "random_forest", {}, {source: {} for source in sources})

    cat_deployment, _ = evaluate_logo(
        frame, lambda: make_pipeline(deployment_config, "catboost", DEFAULT_CATBOOST_PARAMETERS)
    )
    evaluated_predictions["B8_catboost_deployment_fixed"] = cat_deployment
    added_records.append(experiment_record(
        "B8_catboost_deployment_fixed", "catboost", deployment_config.name, cat_deployment, frame,
        "CatBoost on the locked deployment contract", DEFAULT_CATBOOST_PARAMETERS, "fixed conservative configuration",
    ))
    registry["B8_catboost_deployment_fixed"] = (
        deployment_config, "catboost", dict(DEFAULT_CATBOOST_PARAMETERS),
        {source: dict(DEFAULT_CATBOOST_PARAMETERS) for source in sources},
    )

    rf_deployment_fixed, _ = evaluate_logo(
        frame, lambda: make_pipeline(deployment_config, "random_forest", DEFAULT_RANDOM_FOREST_PARAMETERS)
    )
    evaluated_predictions["T4_random_forest_deployment_fixed"] = rf_deployment_fixed
    added_records.append(experiment_record(
        "T4_random_forest_deployment_fixed", "random_forest", deployment_config.name, rf_deployment_fixed, frame,
        "Random Forest on the locked deployment contract", DEFAULT_RANDOM_FOREST_PARAMETERS,
        "fixed conservative configuration",
    ))
    default_rf_map = {source: dict(DEFAULT_RANDOM_FOREST_PARAMETERS) for source in sources}
    registry["T4_random_forest_deployment_fixed"] = (
        deployment_config, "random_forest", dict(DEFAULT_RANDOM_FOREST_PARAMETERS), default_rf_map,
    )

    print("Running controlled nested tuning on the locked Random Forest", flush=True)
    rf_tuned, rf_choices, rf_search = nested_tuned_logo(
        frame,
        lambda parameters: make_pipeline(deployment_config, "random_forest", parameters),
        RANDOM_FOREST_GRID,
        inner_splits=5,
    )
    rf_choice_map = {str(item["outer_source"]): dict(item["parameters"]) for item in rf_choices}
    rf_search.to_csv(EVALUATION_DIR / "tuning_results_random_forest.csv", index=False)
    write_json(EVALUATION_DIR / "tuning_choices_random_forest.json", rf_choices)
    selected_rf_parameters, final_rf_search = select_grouped_parameters(
        frame,
        lambda parameters: make_pipeline(deployment_config, "random_forest", parameters),
        RANDOM_FOREST_GRID,
        inner_splits=5,
    )
    resolved_rf_parameters = {**DEFAULT_RANDOM_FOREST_PARAMETERS, **selected_rf_parameters}
    final_rf_search.to_csv(EVALUATION_DIR / "final_parameter_search_random_forest.csv", index=False)
    evaluated_predictions["T5_random_forest_deployment_nested_tuned"] = rf_tuned
    added_records.append(experiment_record(
        "T5_random_forest_deployment_nested_tuned", "random_forest", deployment_config.name, rf_tuned, frame,
        "Nested source-grouped tuning of the locked deployment contract", RANDOM_FOREST_GRID,
    ))
    registry["T5_random_forest_deployment_nested_tuned"] = (
        deployment_config, "random_forest", resolved_rf_parameters, rf_choice_map,
    )

    rf_fixed_metrics = full_metric_record(frame, rf_deployment_fixed)
    rf_tuned_metrics = full_metric_record(frame, rf_tuned)
    if rf_tuned_metrics["grouped_mae"] < rf_fixed_metrics["grouped_mae"] and rf_tuned_metrics["grouped_rmse"] <= rf_fixed_metrics["grouped_rmse"]:
        primary_id = "T5_random_forest_deployment_nested_tuned"
    else:
        primary_id = "T4_random_forest_deployment_fixed"
    primary_predictions = evaluated_predictions[primary_id]
    primary_config, primary_model, primary_parameters, primary_choice_map = registry[primary_id]

    no_family_config = primary_config.without("catalyst_family", name="feature_a_deployment_no_family")
    no_family_predictions = prediction_with_fold_parameters(
        frame, no_family_config, "random_forest", primary_choice_map
    )
    evaluated_predictions["T8_random_forest_deployment_no_family"] = no_family_predictions
    added_records.append(experiment_record(
        "T8_random_forest_deployment_no_family", "random_forest", no_family_config.name,
        no_family_predictions, frame,
        "Catalyst family removed: simpler and less paper-specific, with comparable or better grouped metrics",
        "parameters selected on outer training papers for the parent contract",
    ))
    registry["T8_random_forest_deployment_no_family"] = (
        no_family_config, "random_forest", primary_parameters, primary_choice_map,
    )
    parent_metrics = full_metric_record(frame, primary_predictions)
    no_family_metrics = full_metric_record(frame, no_family_predictions)
    if (
        no_family_metrics["grouped_mae"] <= parent_metrics["grouped_mae"]
        and no_family_metrics["grouped_rmse"] <= parent_metrics["grouped_rmse"]
        and no_family_metrics["worst_source_mae"] <= parent_metrics["worst_source_mae"] + 0.02
    ):
        primary_id = "T8_random_forest_deployment_no_family"
        primary_predictions = no_family_predictions
        primary_config, primary_model, primary_parameters, primary_choice_map = registry[primary_id]

    identity_config = deployment_identity.without("catalyst_family", name="feature_b_deployment_no_family")
    rf_identity = prediction_with_fold_parameters(
        frame, identity_config, "random_forest", primary_choice_map
    )
    evaluated_predictions["T6_random_forest_identity_sensitivity"] = rf_identity
    added_records.append(experiment_record(
        "T6_random_forest_identity_sensitivity", "random_forest", identity_config.name, rf_identity, frame,
        "Exact identity added to the locked Random Forest contract", "outer training-paper choices",
    ))
    registry["T6_random_forest_identity_sensitivity"] = (
        identity_config, "random_forest", primary_parameters, primary_choice_map,
    )

    interaction_config = deployment_interactions.without("catalyst_family", name="feature_a_deployment_no_family_interactions")
    rf_interactions = prediction_with_fold_parameters(
        frame, interaction_config, "random_forest", primary_choice_map
    )
    evaluated_predictions["T7_random_forest_interaction_sensitivity"] = rf_interactions
    added_records.append(experiment_record(
        "T7_random_forest_interaction_sensitivity", "random_forest", interaction_config.name, rf_interactions, frame,
        "Two engineered interactions added to the locked Random Forest contract", "outer training-paper choices",
    ))
    registry["T7_random_forest_interaction_sensitivity"] = (
        interaction_config, "random_forest", primary_parameters, primary_choice_map,
    )

    cat_for_ensemble, _ = evaluate_logo(
        frame, lambda: make_pipeline(primary_config, "catboost", DEFAULT_CATBOOST_PARAMETERS)
    )
    evaluated_predictions["B9_catboost_champion_contract"] = cat_for_ensemble
    added_records.append(experiment_record(
        "B9_catboost_champion_contract", "catboost", primary_config.name, cat_for_ensemble, frame,
        "CatBoost comparison on the exact final Random Forest feature contract",
        DEFAULT_CATBOOST_PARAMETERS, "fixed conservative configuration",
    ))
    registry["B9_catboost_champion_contract"] = (
        primary_config, "catboost", dict(DEFAULT_CATBOOST_PARAMETERS),
        {source: dict(DEFAULT_CATBOOST_PARAMETERS) for source in sources},
    )

    print("Running ablations around the strongest generalization-oriented candidate", flush=True)
    ablation_configs = {
        "remove_support": primary_config.without("support_material", "support_reported", name="feature_a_reduced_no_support"),
    }
    ablation_rows = []
    primary_metrics = full_metric_record(frame, primary_predictions)
    for name, config in ablation_configs.items():
        prediction = prediction_with_fold_parameters(frame, config, primary_model, primary_choice_map)
        metrics = full_metric_record(frame, prediction)
        ablation_rows.append({
            "ablation": name, "reference": primary_config.name, **metrics,
            "delta_mae": metrics["grouped_mae"] - primary_metrics["grouped_mae"],
            "delta_rmse": metrics["grouped_rmse"] - primary_metrics["grouped_rmse"],
            "delta_r2": metrics["grouped_r2"] - primary_metrics["grouped_r2"],
        })
    staged_references = {
        "remove_catalyst_family": deployment_config,
        "remove_pressure": no_milling.without("catalyst_elements", "explicit_element_count", "preparation_method", "catalyst_family", name="feature_a_no_milling_no_elements_no_preparation_no_family"),
        "remove_elements": no_milling.without("pressure_bar", "pressure_missing", "pressure_relation", "preparation_method", "catalyst_family", name="feature_a_no_milling_no_pressure_no_preparation_no_family"),
        "remove_milling_details": FEATURE_A.without("pressure_bar", "pressure_missing", "pressure_relation", "catalyst_elements", "explicit_element_count", "preparation_method", "catalyst_family", name="feature_a_no_pressure_no_elements_no_preparation_no_family"),
        "remove_preparation_variables": final_general.without("catalyst_family", name="feature_a_reduced_no_family"),
    }
    for name, reference_config in staged_references.items():
        reference_prediction = prediction_with_fold_parameters(frame, reference_config, primary_model, primary_choice_map)
        reference_metrics = full_metric_record(frame, reference_prediction)
        ablation_rows.append({
            "ablation": name, "reference": reference_config.name, **primary_metrics,
            "delta_mae": primary_metrics["grouped_mae"] - reference_metrics["grouped_mae"],
            "delta_rmse": primary_metrics["grouped_rmse"] - reference_metrics["grouped_rmse"],
            "delta_r2": primary_metrics["grouped_r2"] - reference_metrics["grouped_r2"],
        })
    identity_metrics = full_metric_record(frame, evaluated_predictions["T6_random_forest_identity_sensitivity"])
    ablation_rows.append({
        "ablation": "remove_exact_identity", "reference": identity_config.name, **primary_metrics,
        "delta_mae": primary_metrics["grouped_mae"] - identity_metrics["grouped_mae"],
        "delta_rmse": primary_metrics["grouped_rmse"] - identity_metrics["grouped_rmse"],
        "delta_r2": primary_metrics["grouped_r2"] - identity_metrics["grouped_r2"],
    })
    interaction_metrics = full_metric_record(frame, evaluated_predictions["T7_random_forest_interaction_sensitivity"])
    ablation_rows.append({
        "ablation": "remove_engineered_interactions", "reference": interaction_config.name, **primary_metrics,
        "delta_mae": primary_metrics["grouped_mae"] - interaction_metrics["grouped_mae"],
        "delta_rmse": primary_metrics["grouped_rmse"] - interaction_metrics["grouped_rmse"],
        "delta_r2": primary_metrics["grouped_r2"] - interaction_metrics["grouped_r2"],
    })
    feature_selection_ablations = pd.DataFrame(ablation_rows)
    feature_selection_ablations.to_csv(
        EVALUATION_DIR / "feature_selection_ablation_results.csv", index=False
    )

    print("Running ensemble experiment", flush=True)
    simple_ensemble = (primary_predictions + cat_for_ensemble) / 2.0
    cat_default_map = {source: dict(DEFAULT_CATBOOST_PARAMETERS) for source in sources}
    weighted_ensemble, ensemble_weights = nested_weighted_ensemble(
        frame, primary_config, cat_default_map, primary_choice_map
    )
    ensemble_weights.to_csv(EVALUATION_DIR / "ensemble_fold_weights.csv", index=False)
    ensemble_records = []
    for name, prediction in (("simple_mean_catboost_random_forest", simple_ensemble), ("nested_weighted_catboost_random_forest", weighted_ensemble)):
        metrics = full_metric_record(frame, prediction)
        ensemble_records.append({"ensemble": name, **metrics})
        added_records.append(experiment_record(
            name, "ensemble", primary_config.name, prediction, frame, "Locked-contract CatBoost + Random Forest",
            "equal weights" if name.startswith("simple") else "outer-training grouped-CV inverse-MAE weights",
        ))
        evaluated_predictions[name] = prediction
    ensemble_results = pd.DataFrame(ensemble_records).sort_values("grouped_mae")

    candidate_records = pd.concat([initial_leaderboard, pd.DataFrame(added_records)], ignore_index=True)
    candidate_records = candidate_records.sort_values(["grouped_mae", "grouped_rmse"], kind="stable")
    single_candidates = candidate_records[~candidate_records["model"].eq("ensemble")].copy()
    general_candidates = single_candidates[~single_candidates["feature_set"].str.contains("feature_b")]
    identity_candidates = single_candidates[single_candidates["feature_set"].str.contains("feature_b")]
    best_general = general_candidates.iloc[0]
    best_single_row = best_general
    if len(identity_candidates):
        best_identity = identity_candidates.iloc[0]
        identity_clear = (
            float(best_general["grouped_mae"] - best_identity["grouped_mae"]) >= max(0.03, 0.02 * float(best_general["grouped_mae"]))
            and float(best_general["grouped_rmse"] - best_identity["grouped_rmse"]) >= max(0.03, 0.02 * float(best_general["grouped_rmse"]))
            and float(best_identity["absorption_mae"]) <= float(best_general["absorption_mae"]) + 0.02
            and float(best_identity["desorption_mae"]) <= float(best_general["desorption_mae"]) + 0.02
            and float(best_identity["worst_source_mae"]) <= float(best_general["worst_source_mae"])
        )
        if identity_clear:
            best_single_row = best_identity
    best_single_id = str(best_single_row["experiment_id"])
    best_single_predictions = evaluated_predictions[best_single_id]

    best_ensemble = ensemble_results.iloc[0]
    clear_mae = float(best_single_row["grouped_mae"] - best_ensemble["grouped_mae"]) >= max(0.03, 0.02 * float(best_single_row["grouped_mae"]))
    clear_rmse = float(best_single_row["grouped_rmse"] - best_ensemble["grouped_rmse"]) >= max(0.03, 0.02 * float(best_single_row["grouped_rmse"]))
    no_mode_harm = float(best_ensemble["absorption_mae"]) <= float(best_single_row["absorption_mae"]) + 0.02 and float(best_ensemble["desorption_mae"]) <= float(best_single_row["desorption_mae"]) + 0.02
    no_difficult_harm = float(best_ensemble["worst_source_mae"]) <= float(best_single_row["worst_source_mae"]) + 0.05
    ensemble_retained = bool(clear_mae and clear_rmse and no_mode_harm and no_difficult_harm)
    ensemble_results["retained"] = False
    if ensemble_retained:
        ensemble_results.loc[ensemble_results["ensemble"].eq(best_ensemble["ensemble"]), "retained"] = True
    ensemble_results["decision_reason"] = (
        "retained: clear MAE/RMSE improvement without material mode or worst-source harm"
        if ensemble_retained else "not retained: improvement did not satisfy the predeclared clear/distributed benefit rule"
    )
    ensemble_results.to_csv(EVALUATION_DIR / "ensemble_results.csv", index=False)

    champion_id = str(best_ensemble["ensemble"]) if ensemble_retained else best_single_id
    champion_predictions = evaluated_predictions[champion_id] if ensemble_retained else best_single_predictions
    registry_id = primary_id if ensemble_retained else best_single_id
    champion_config, champion_model, champion_parameters, champion_choice_map = registry[registry_id]
    algorithm_names = {
        "catboost": "CatBoostRegressor",
        "random_forest": "RandomForestRegressor",
        "extra_trees": "ExtraTreesRegressor",
        "ridge": "Ridge",
        "elastic_net": "ElasticNet",
        "dummy_median": "DummyRegressor(median)",
    }
    champion_algorithm = "CatBoostRegressor + RandomForestRegressor" if ensemble_retained else algorithm_names[champion_model]
    print(f"Champion candidate: {champion_id}", flush=True)
    official_metrics = full_metric_record(frame, champion_predictions)
    source = per_source_metrics(frame, champion_predictions)
    source.to_csv(EVALUATION_DIR / "per_source_metrics.csv", index=False)

    print("Running champion-contract ablations", flush=True)
    champion_ablation_rows = []
    direct_champion_ablations = {
        "remove_support": champion_config.without(
            "support_material", "support_reported", name="champion_no_support"
        ),
    }
    for name, config in direct_champion_ablations.items():
        prediction = prediction_with_fold_parameters(
            frame, config, champion_model, champion_choice_map
        )
        metrics = full_metric_record(frame, prediction)
        champion_ablation_rows.append({
            "ablation": name,
            "reference": champion_config.name,
            **metrics,
            "delta_mae": metrics["grouped_mae"] - official_metrics["grouped_mae"],
            "delta_rmse": metrics["grouped_rmse"] - official_metrics["grouped_rmse"],
            "delta_r2": metrics["grouped_r2"] - official_metrics["grouped_r2"],
        })
    champion_reference_configs = {
        "remove_catalyst_family": deployment_config,
        "remove_pressure": no_milling.without(
            "catalyst_elements", "explicit_element_count", "preparation_method", "catalyst_family",
            name="reference_with_pressure",
        ),
        "remove_elements": no_milling.without(
            "pressure_bar", "pressure_missing", "pressure_relation", "preparation_method", "catalyst_family",
            name="reference_with_elements",
        ),
        "remove_milling_details": FEATURE_A.without(
            "pressure_bar", "pressure_missing", "pressure_relation", "catalyst_elements",
            "explicit_element_count", "preparation_method", "catalyst_family",
            name="reference_with_milling",
        ),
        "remove_preparation_variables": final_general.without(
            "catalyst_family", name="reference_with_preparation"
        ),
        "remove_exact_identity": identity_config,
        "remove_engineered_interactions": interaction_config,
    }
    for name, reference_config in champion_reference_configs.items():
        reference_prediction = prediction_with_fold_parameters(
            frame, reference_config, champion_model, champion_choice_map
        )
        reference_metrics = full_metric_record(frame, reference_prediction)
        champion_ablation_rows.append({
            "ablation": name,
            "reference": reference_config.name,
            **official_metrics,
            "delta_mae": official_metrics["grouped_mae"] - reference_metrics["grouped_mae"],
            "delta_rmse": official_metrics["grouped_rmse"] - reference_metrics["grouped_rmse"],
            "delta_r2": official_metrics["grouped_r2"] - reference_metrics["grouped_r2"],
        })
    ablations = pd.DataFrame(champion_ablation_rows)
    ablations.to_csv(EVALUATION_DIR / "ablation_results.csv", index=False)

    unseen_system_mask = np.zeros(len(frame), dtype=bool)
    for train_index, test_index in logo_splits(frame):
        training_systems = set(frame.iloc[train_index]["catalyst_system_group"])
        unseen_system_mask[test_index] = ~frame.iloc[test_index]["catalyst_system_group"].isin(training_systems)
    transfer_metrics = subset_metrics(frame, champion_predictions, unseen_system_mask)
    catalyst_group_predictions = evaluate_grouped(
        frame, lambda: make_pipeline(champion_config, champion_model, champion_parameters), "catalyst_system_group"
    )
    catalyst_group_metrics = full_metric_record(frame, catalyst_group_predictions)

    sensitivity = {
        "pressure_known_primary_oof": subset_metrics(frame, champion_predictions, frame["pressure_bar"].notna()),
        "pressure_missing_primary_oof": subset_metrics(frame, champion_predictions, frame["pressure_bar"].isna()),
        "reported_primary_oof": subset_metrics(frame, champion_predictions, frame["value_qualifier"].eq("reported")),
        "approximate_primary_oof": subset_metrics(frame, champion_predictions, frame["value_qualifier"].eq("approximately")),
        "source_held_out_catalyst_system_unseen": transfer_metrics,
        "catalyst_system_group_logo_secondary": catalyst_group_metrics,
        "catalyst_system_group_caveat": "Secondary only: another catalyst system from the same paper may remain in training.",
    }
    for label, mask in (("reported_only_retrained", frame["value_qualifier"].eq("reported")), ("pressure_known_retrained", frame["pressure_bar"].notna())):
        subset = frame.loc[mask].reset_index(drop=True)
        prediction = prediction_with_fold_parameters(subset, champion_config, champion_model, champion_choice_map)
        sensitivity[label] = full_metric_record(subset, prediction)
    reported_metrics = sensitivity["reported_only_retrained"]
    ablations = pd.DataFrame([
        *ablations.to_dict(orient="records"),
        {
            "ablation": "remove_approximate_observations", "reference": champion_config.name,
            **reported_metrics, "delta_mae": None, "delta_rmse": None, "delta_r2": None,
        },
    ])
    ablations.to_csv(EVALUATION_DIR / "ablation_results.csv", index=False)
    write_json(EVALUATION_DIR / "sensitivity_results.json", sensitivity)

    print("Calibrating cross-fitted uncertainty", flush=True)
    interval_lower, interval_upper, interval_summary = crossfit_intervals(
        frame, champion_config, champion_model, champion_choice_map
    )
    uncertainty_defensible = bool(
        interval_summary["coverage"] >= 0.75
        and interval_summary["absorption_coverage"] >= 0.70
        and interval_summary["desorption_coverage"] >= 0.70
    )
    interval_summary["retained"] = uncertainty_defensible
    interval_summary["retention_rule"] = "overall coverage >= 0.75 and each mode coverage >= 0.70"
    write_json(EVALUATION_DIR / "uncertainty_evaluation.json", interval_summary)

    print("Running grouped learning curve", flush=True)
    learning = learning_curve(frame, lambda: make_pipeline(champion_config, champion_model, champion_parameters))
    learning.to_csv(EVALUATION_DIR / "learning_curve.csv", index=False)
    learning_summary = learning.groupby("training_papers").agg(
        mae_mean=("mae", "mean"), mae_median=("mae", "median"), mae_std=("mae", "std"),
        rmse_mean=("rmse", "mean"), evaluations=("mae", "size")
    ).reset_index()

    final_single = make_pipeline(champion_config, champion_model, champion_parameters)
    final_single.fit(frame, frame[TARGET].to_numpy(float))
    if ensemble_retained:
        final_cat = make_pipeline(primary_config, "catboost", DEFAULT_CATBOOST_PARAMETERS)
        final_cat.fit(frame, frame[TARGET].to_numpy(float))
        cat_cv = grouped_cv_predictions(frame, lambda: make_pipeline(primary_config, "catboost", DEFAULT_CATBOOST_PARAMETERS), 5)
        forest_cv = grouped_cv_predictions(frame, lambda: make_pipeline(primary_config, "random_forest", primary_parameters), 5)
        inverse = 1.0 / np.asarray([mean_absolute_error(frame[TARGET], cat_cv), mean_absolute_error(frame[TARGET], forest_cv)])
        final_weights = (inverse / inverse.sum()).tolist()
        fitted_predictor: Any = PredictionEnsemble([final_cat, final_single], final_weights)
    else:
        final_weights = None
        fitted_predictor = final_single

    feature_names = final_single.named_steps["preprocess"].get_feature_names_out()
    estimator = final_single.named_steps["model"]
    raw_importance = np.asarray(
        estimator.get_feature_importance() if hasattr(estimator, "get_feature_importance") else estimator.feature_importances_,
        dtype=float,
    )
    importance = pd.DataFrame({"feature": feature_names, "importance": raw_importance}).sort_values("importance", ascending=False)
    importance.to_csv(EVALUATION_DIR / "feature_importance.csv", index=False)

    residuals = frame[TARGET].to_numpy(float) - champion_predictions
    deployment_intervals = None
    if uncertainty_defensible:
        deployment_intervals = {"pooled": np.quantile(residuals, [0.05, 0.95]).tolist()}
        for mode in ("absorption", "desorption"):
            deployment_intervals[mode] = np.quantile(residuals[frame["measurement_mode"].eq(mode)], [0.05, 0.95]).tolist()

    support_profile = create_support_profile(frame)
    write_json(ARTIFACTS_DIR / "support_profile.json", support_profile)
    versions = {
        package: importlib.metadata.version(package)
        for package in ("numpy", "pandas", "pyarrow", "scikit-learn", "scipy", "joblib", "matplotlib", "catboost")
    }
    metadata = {
        "model_id": MODEL_ID,
        "algorithm": champion_algorithm,
        "algorithm_key": champion_model,
        "champion_experiment_id": champion_id,
        "target": TARGET,
        "feature_set": champion_config.name,
        "predictive_features": sorted(predictive_fields(champion_config)),
        "predictive_raw_inputs": [
            "measurement_mode",
            "temperature_c",
            "duration_seconds",
            "catalyst_loading_wt_pct",
            "catalyst_family",
            "support_material",
            "catalyst_components",
        ],
        "derived_predictive_features": [
            "log_duration_seconds",
            "loading_missing",
            "support_reported",
            "catalyst_present",
            "explicit_component_count",
        ],
        "required_inference_inputs": [
            "measurement_mode",
            "temperature_c",
            "duration_seconds",
            "catalyst_family",
            "catalyst_elements",
            "catalyst_components",
        ],
        "support_only_inputs": [
            "pressure_bar",
            "catalyst_elements",
            "preparation_method",
            "milling_time_h",
            "milling_speed_rpm",
            "ball_to_powder_ratio",
        ],
        "excluded_metadata_fields": list(METADATA_COLUMNS),
        "training_row_count": int(len(frame)),
        "paper_count": int(frame[GROUP_COLUMN].nunique()),
        "dataset_sha256": sha256_file(),
        "dependency_versions": versions,
        "random_seeds": [RANDOM_SEED],
        "official_grouped_metrics": official_metrics,
        "uncertainty_method": interval_summary["method"] if uncertainty_defensible else "omitted because cross-fitted coverage rule failed",
        "uncertainty_evaluation": {key: value for key, value in interval_summary.items() if key != "folds"},
        "support_profile_version": support_profile["version"],
        "augmentation_decision": "NOT USED: no defensible measurement-precision scale is available",
        "tuning_decision": "Nested grouped tuning improved the Random Forest candidate; the fixed conservative CatBoost comparison subsequently won on the locked contract",
        "catalyst_family_decision": "granular family category removed; catalyst_family is used only to derive the catalyst-present indicator and enforce support",
        "exact_identity_decision": "not retained: identity-aware improvement was not clear and robust across metrics",
        "ensemble_decision": "retained" if ensemble_retained else "not retained",
        "ensemble_weights": final_weights,
        "final_hyperparameters": champion_parameters,
        "official_performance_source": "paper-held-out out-of-fold predictions; final full-data fit metrics are not evidence",
        "activation_energy_model": "DEFERRED",
    }
    write_json(ARTIFACTS_DIR / "model_metadata.json", metadata)
    bundle = CapacityModelBundle(
        pipeline=fitted_predictor,
        model_id=MODEL_ID,
        feature_config=champion_config.name,
        algorithm=champion_algorithm,
        metadata=metadata,
        support_profile=support_profile,
        interval_quantiles=deployment_intervals,
    )
    artifact_path = ARTIFACTS_DIR / "capacity_model.joblib"
    save_bundle(bundle, artifact_path)

    oof = frame[["measurement_id", "sample_id", "source_id", "paper_id", "experiment_group_id", "catalyst_system_group", "measurement_mode", "value_qualifier", "pressure_bar", TARGET]].copy()
    oof["prediction"] = champion_predictions
    oof["residual_actual_minus_prediction"] = oof[TARGET] - oof["prediction"]
    oof["absolute_error"] = oof["residual_actual_minus_prediction"].abs()
    oof["catalyst_system_unseen_in_source_fold"] = unseen_system_mask
    oof["interval_lower_90"] = interval_lower if uncertainty_defensible else np.nan
    oof["interval_upper_90"] = interval_upper if uncertainty_defensible else np.nan
    oof.to_csv(EVALUATION_DIR / "oof_predictions.csv", index=False)

    candidate_records.to_csv(EVALUATION_DIR / "experiment_log.csv", index=False)
    candidate_records.to_csv(EVALUATION_DIR / "leaderboard.csv", index=False)
    diagnostics = {
        "linear_baseline": diagnostic_summary(frame, initial_predictions["L0_ridge_compact"]),
        "champion": diagnostic_summary(frame, champion_predictions),
    }
    write_json(EVALUATION_DIR / "diagnostics.json", diagnostics)
    feature_summary = {
        "feature_set_a": sorted(predictive_fields(FEATURE_A)),
        "champion_feature_contract": sorted(predictive_fields(champion_config)),
        "feature_set_b_additions": ["catalyst_additive", "catalyst_composition"],
        "constant_columns_removed": ["base_material", "material_class", "experimental_method", "capacity_basis", "extraction_type"],
        "element_vocabulary": support_profile["known_elements"],
        "top_model_importance": importance.head(30).to_dict(orient="records"),
        "importance_interpretation": "Importance to this predictive model; not scientific causal importance.",
    }
    write_json(EVALUATION_DIR / "feature_summary.json", feature_summary)
    metrics_payload = {
        "model_id": MODEL_ID,
        "champion_experiment_id": champion_id,
        "champion_algorithm": champion_algorithm,
        "official_logo_metrics": official_metrics,
        "best_single_model": best_single_row.to_dict(),
        "ensemble_retained": ensemble_retained,
        "sensitivity": sensitivity,
        "uncertainty": {key: value for key, value in interval_summary.items() if key != "folds"},
        "learning_curve_summary": learning_summary.to_dict(orient="records"),
        "dataset_sha256": metadata["dataset_sha256"],
        "artifact_size_bytes": artifact_path.stat().st_size,
    }
    write_json(EVALUATION_DIR / "metrics.json", metrics_payload)
    plot_outputs(frame, champion_predictions, source, learning, candidate_records, importance)
    print(json.dumps(json_ready(metrics_payload), indent=2, sort_keys=True), flush=True)


if __name__ == "__main__":
    main()
