from __future__ import annotations

from collections.abc import Callable

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupKFold, LeaveOneGroupOut

from .data import GROUP_COLUMN, TARGET, logo_splits


def regression_metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    return {
        "mae": float(mean_absolute_error(actual, predicted)),
        "rmse": float(mean_squared_error(actual, predicted) ** 0.5),
        "r2": float(r2_score(actual, predicted)) if len(actual) >= 2 else float("nan"),
    }


def evaluate_logo(frame: pd.DataFrame, pipeline_factory: Callable[[], object]) -> tuple[np.ndarray, list[object]]:
    predictions = np.full(len(frame), np.nan, dtype=float)
    fitted: list[object] = []
    for train_index, test_index in logo_splits(frame):
        pipeline = pipeline_factory()
        pipeline.fit(frame.iloc[train_index], frame.iloc[train_index][TARGET].to_numpy(dtype=float))
        predictions[test_index] = pipeline.predict(frame.iloc[test_index])
        fitted.append(pipeline)
    if not np.isfinite(predictions).all():
        raise AssertionError("LOPO did not produce a finite prediction for every row")
    return predictions, fitted


def evaluate_grouped(
    frame: pd.DataFrame,
    pipeline_factory: Callable[[], object],
    group_column: str,
) -> np.ndarray:
    predictions = np.full(len(frame), np.nan, dtype=float)
    groups = frame[group_column].to_numpy()
    splitter = LeaveOneGroupOut()
    for train_index, test_index in splitter.split(frame, frame[TARGET], groups):
        pipeline = pipeline_factory()
        pipeline.fit(frame.iloc[train_index], frame.iloc[train_index][TARGET].to_numpy(float))
        predictions[test_index] = pipeline.predict(frame.iloc[test_index])
    if not np.isfinite(predictions).all():
        raise AssertionError(f"Grouped evaluation for {group_column} produced incomplete predictions")
    return predictions


def grouped_cv_predictions(frame: pd.DataFrame, pipeline_factory: Callable[[], object], n_splits: int = 5) -> np.ndarray:
    predictions = np.full(len(frame), np.nan, dtype=float)
    groups = frame[GROUP_COLUMN].to_numpy()
    splitter = GroupKFold(n_splits=min(n_splits, len(np.unique(groups))))
    for train_index, test_index in splitter.split(frame, frame[TARGET], groups):
        pipeline = pipeline_factory()
        pipeline.fit(frame.iloc[train_index], frame.iloc[train_index][TARGET].to_numpy(float))
        predictions[test_index] = pipeline.predict(frame.iloc[test_index])
    if not np.isfinite(predictions).all():
        raise AssertionError("Grouped CV produced incomplete predictions")
    return predictions


def nested_tuned_logo(
    frame: pd.DataFrame,
    pipeline_from_parameters: Callable[[dict[str, object]], object],
    parameter_grid: list[dict[str, object]],
    inner_splits: int = 5,
) -> tuple[np.ndarray, list[dict[str, object]], pd.DataFrame]:
    predictions = np.full(len(frame), np.nan, dtype=float)
    choices: list[dict[str, object]] = []
    search_records: list[dict[str, object]] = []
    for outer_train, outer_test in logo_splits(frame):
        training = frame.iloc[outer_train].reset_index(drop=True)
        held_source = str(frame.iloc[outer_test][GROUP_COLUMN].iloc[0])
        best_parameters: dict[str, object] | None = None
        best_mae = float("inf")
        for grid_index, parameters in enumerate(parameter_grid):
            inner_predictions = grouped_cv_predictions(
                training,
                lambda parameters=parameters: pipeline_from_parameters(parameters),
                inner_splits,
            )
            inner_mae = float(mean_absolute_error(training[TARGET].to_numpy(float), inner_predictions))
            search_records.append(
                {
                    "outer_source": held_source,
                    "grid_index": grid_index,
                    "parameters": parameters,
                    "inner_grouped_mae": inner_mae,
                }
            )
            if inner_mae < best_mae:
                best_mae = inner_mae
                best_parameters = parameters
        if best_parameters is None:
            raise AssertionError("Nested tuning did not select parameters")
        pipeline = pipeline_from_parameters(best_parameters)
        pipeline.fit(frame.iloc[outer_train], frame.iloc[outer_train][TARGET].to_numpy(float))
        predictions[outer_test] = pipeline.predict(frame.iloc[outer_test])
        choices.append(
            {
                "outer_source": held_source,
                "inner_grouped_mae": best_mae,
                "parameters": best_parameters,
            }
        )
    return predictions, choices, pd.DataFrame(search_records)


def select_grouped_parameters(
    frame: pd.DataFrame,
    pipeline_from_parameters: Callable[[dict[str, object]], object],
    parameter_grid: list[dict[str, object]],
    inner_splits: int = 5,
) -> tuple[dict[str, object], pd.DataFrame]:
    records = []
    for grid_index, parameters in enumerate(parameter_grid):
        predictions = grouped_cv_predictions(
            frame,
            lambda parameters=parameters: pipeline_from_parameters(parameters),
            inner_splits,
        )
        metrics = regression_metrics(frame[TARGET].to_numpy(float), predictions)
        records.append({"grid_index": grid_index, "parameters": parameters, **metrics})
    results = pd.DataFrame(records).sort_values(["mae", "rmse"], kind="stable")
    return dict(results.iloc[0]["parameters"]), results


def full_metric_record(frame: pd.DataFrame, predicted: np.ndarray) -> dict[str, float]:
    actual = frame[TARGET].to_numpy(dtype=float)
    result = {f"grouped_{key}": value for key, value in regression_metrics(actual, predicted).items()}
    for mode in ("absorption", "desorption"):
        mask = frame["measurement_mode"].eq(mode).to_numpy()
        result[f"{mode}_mae"] = float(mean_absolute_error(actual[mask], predicted[mask]))
        result[f"{mode}_rmse"] = float(mean_squared_error(actual[mask], predicted[mask]) ** 0.5)
    source = per_source_metrics(frame, predicted)
    result["median_source_mae"] = float(source["mae"].median())
    result["worst_source_mae"] = float(source["mae"].max())
    return result


def per_source_metrics(frame: pd.DataFrame, predicted: np.ndarray) -> pd.DataFrame:
    working = frame[[GROUP_COLUMN, "paper_id", TARGET]].copy()
    working["prediction"] = predicted
    records = []
    for (source_id, paper_id), part in working.groupby([GROUP_COLUMN, "paper_id"], sort=True):
        metrics = regression_metrics(part[TARGET].to_numpy(float), part["prediction"].to_numpy(float))
        records.append({"source_id": source_id, "paper_id": paper_id, "rows": len(part), **metrics})
    return pd.DataFrame(records)


def subset_metrics(frame: pd.DataFrame, predicted: np.ndarray, mask: pd.Series | np.ndarray) -> dict[str, float | int]:
    mask_array = np.asarray(mask, dtype=bool)
    if not mask_array.any():
        return {"rows": 0, "mae": float("nan"), "rmse": float("nan"), "r2": float("nan")}
    actual = frame[TARGET].to_numpy(float)[mask_array]
    return {"rows": int(mask_array.sum()), **regression_metrics(actual, predicted[mask_array])}
