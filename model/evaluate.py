from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from src.data import TARGET, load_capacity_data
from src.evaluation import evaluate_logo, full_metric_record
from src.features import FEATURE_A, FEATURE_A_INTERACTIONS, FEATURE_B, COMPACT, CONDITIONS, FeatureConfig
from src.modeling import RANDOM_SEED, make_pipeline


MODEL_DIR = Path(__file__).resolve().parent
EVALUATION_DIR = MODEL_DIR / "evaluation"


@dataclass(frozen=True)
class Experiment:
    experiment_id: str
    model: str
    config: FeatureConfig
    parameters: dict[str, Any]
    notes: str


INITIAL_EXPERIMENTS = (
    Experiment("D0_dummy_median", "dummy_median", COMPACT, {}, "Naive median reference"),
    Experiment("L0_ridge_compact", "ridge", COMPACT, {"alpha": 10.0}, "Compact linear baseline"),
    Experiment("L1_ridge_conditions", "ridge", CONDITIONS, {"alpha": 10.0}, "Conditions and missingness"),
    Experiment("L2_ridge_feature_a", "ridge", FEATURE_A, {"alpha": 10.0}, "Generalization-oriented chemistry"),
    Experiment("L3_ridge_feature_b", "ridge", FEATURE_B, {"alpha": 10.0}, "Identity-aware chemistry"),
    Experiment("L4_ridge_interactions", "ridge", FEATURE_A_INTERACTIONS, {"alpha": 10.0}, "Two controlled interactions"),
    Experiment(
        "L5_elastic_feature_a",
        "elastic_net",
        FEATURE_A,
        {"alpha": 0.05, "l1_ratio": 0.2},
        "Regularized sparse linear sensitivity",
    ),
    Experiment("T0_random_forest_a", "random_forest", FEATURE_A, {}, "Regularized bagged trees"),
    Experiment("T1_extra_trees_a", "extra_trees", FEATURE_A, {}, "Regularized randomized trees"),
    Experiment("T2_extra_trees_b", "extra_trees", FEATURE_B, {}, "Identity-aware randomized trees"),
    Experiment("B0_catboost_a", "catboost", FEATURE_A, {}, "Shallow regularized boosting"),
    Experiment("B1_catboost_b", "catboost", FEATURE_B, {}, "Identity-aware shallow boosting"),
)


def refinement_experiments() -> tuple[Experiment, ...]:
    base = FEATURE_A.without(
        "milling_time_h", "milling_speed_rpm", "ball_to_powder_ratio_numeric",
        "pressure_bar", "pressure_missing", "pressure_relation",
        name="feature_a_no_milling_no_pressure",
    )
    identity = FEATURE_B.without(
        "milling_time_h", "milling_speed_rpm", "ball_to_powder_ratio_numeric",
        "pressure_bar", "pressure_missing", "pressure_relation",
        name="feature_b_no_milling_no_pressure",
    )
    interactions = FEATURE_A_INTERACTIONS.without(
        "milling_time_h", "milling_speed_rpm", "ball_to_powder_ratio_numeric",
        "pressure_bar", "pressure_missing", "pressure_relation",
        name="feature_a_interactions_no_milling_no_pressure",
    )
    variants = {
        "R0_pressure_free_reference": base,
        "R1_pressure_free_no_elements": base.without("catalyst_elements", "explicit_element_count", name="pressure_free_no_elements"),
        "R2_pressure_free_no_family": base.without("catalyst_family", name="pressure_free_no_family"),
        "R3_pressure_free_no_support": base.without("support_material", "support_reported", name="pressure_free_no_support"),
        "R4_pressure_free_no_preparation": base.without("preparation_method", name="pressure_free_no_preparation"),
        "R5_pressure_free_identity": identity,
        "R6_pressure_free_interactions": interactions,
    }
    return tuple(
        Experiment(experiment_id, "catboost", config, {}, "Final bounded pressure-free refinement")
        for experiment_id, config in variants.items()
    )


def random_forest_refinement_experiments() -> tuple[Experiment, ...]:
    base = FEATURE_A.without(
        "milling_time_h", "milling_speed_rpm", "ball_to_powder_ratio_numeric",
        "pressure_bar", "pressure_missing", "pressure_relation",
        "catalyst_elements", "explicit_element_count",
        name="feature_a_reduced",
    )
    identity = FEATURE_B.without(
        "milling_time_h", "milling_speed_rpm", "ball_to_powder_ratio_numeric",
        "pressure_bar", "pressure_missing", "pressure_relation",
        "catalyst_elements", "explicit_element_count",
        name="feature_b_reduced",
    )
    interactions = FEATURE_A_INTERACTIONS.without(
        "milling_time_h", "milling_speed_rpm", "ball_to_powder_ratio_numeric",
        "pressure_bar", "pressure_missing", "pressure_relation",
        "catalyst_elements", "explicit_element_count",
        name="feature_a_reduced_interactions",
    )
    variants = {
        "RF0_reduced_reference": base,
        "RF1_reduced_no_family": base.without("catalyst_family", name="feature_a_reduced_no_family"),
        "RF2_reduced_no_support": base.without("support_material", "support_reported", name="feature_a_reduced_no_support"),
        "RF3_reduced_no_preparation": base.without("preparation_method", name="feature_a_reduced_no_preparation"),
        "RF4_reduced_identity": identity,
        "RF5_reduced_interactions": interactions,
        "RF6_no_preparation_no_family": base.without("preparation_method", "catalyst_family", name="feature_a_reduced_no_preparation_no_family"),
        "RF7_no_preparation_no_support": base.without("preparation_method", "support_material", "support_reported", name="feature_a_reduced_no_preparation_no_support"),
        "RF8_no_preparation_identity": identity.without("preparation_method", name="feature_b_reduced_no_preparation"),
    }
    return tuple(
        Experiment(experiment_id, "random_forest", config, {}, "Champion-algorithm ablation")
        for experiment_id, config in variants.items()
    )


def run_experiments(frame: pd.DataFrame, experiments: tuple[Experiment, ...]) -> tuple[pd.DataFrame, dict[str, np.ndarray]]:
    records: list[dict[str, Any]] = []
    predictions: dict[str, np.ndarray] = {}
    for experiment in experiments:
        print(f"Evaluating {experiment.experiment_id}", flush=True)
        predicted, _ = evaluate_logo(
            frame,
            lambda experiment=experiment: make_pipeline(
                experiment.config, experiment.model, experiment.parameters
            ),
        )
        predictions[experiment.experiment_id] = predicted
        metrics = full_metric_record(frame, predicted)
        records.append(
            {
                "experiment_id": experiment.experiment_id,
                "model": experiment.model,
                "feature_set": experiment.config.name,
                "augmentation": "not_used",
                "preprocessing": "fold-local median/explicit missing/OHE/element multi-hot",
                "regularization": "fixed conservative configuration",
                "hyperparameters": json.dumps(experiment.parameters, sort_keys=True),
                "seed": RANDOM_SEED,
                "grouping_strategy": "LeaveOneGroupOut(source_id)",
                **metrics,
                "notes": experiment.notes,
            }
        )
    leaderboard = pd.DataFrame(records).sort_values(["grouped_mae", "grouped_rmse"], kind="stable")
    return leaderboard, predictions


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--initial", action="store_true", help="Run the fixed baseline/model progression")
    parser.add_argument("--refine", action="store_true", help="Run the bounded pressure-free refinement")
    parser.add_argument("--refine-rf", action="store_true", help="Run ablations with the provisional Random Forest champion")
    args = parser.parse_args()
    if not args.initial and not args.refine and not args.refine_rf:
        parser.error("Use --initial, --refine, or --refine-rf; final evaluation is generated by train.py")
    EVALUATION_DIR.mkdir(parents=True, exist_ok=True)
    frame = load_capacity_data()
    experiments = INITIAL_EXPERIMENTS if args.initial else (random_forest_refinement_experiments() if args.refine_rf else refinement_experiments())
    leaderboard, predictions = run_experiments(frame, experiments)
    output_stem = "initial" if args.initial else ("random_forest_refinement" if args.refine_rf else "refinement_probe")
    leaderboard.to_csv(EVALUATION_DIR / f"{output_stem}_leaderboard.csv", index=False)
    prediction_frame = frame[["measurement_id", "source_id", "paper_id", "measurement_mode", TARGET]].copy()
    for experiment_id, values in predictions.items():
        prediction_frame[experiment_id] = values
    prediction_frame.to_csv(EVALUATION_DIR / f"{output_stem}_oof_predictions.csv", index=False)
    print(leaderboard[["experiment_id", "grouped_mae", "grouped_rmse", "grouped_r2", "absorption_mae", "desorption_mae", "median_source_mae", "worst_source_mae"]].to_string(index=False))


if __name__ == "__main__":
    main()
