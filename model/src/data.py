from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Iterator

import numpy as np
import pandas as pd
from sklearn.model_selection import LeaveOneGroupOut


REPO_ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = REPO_ROOT / "data" / "phase4_dataset"
CAPACITY_CSV = DATASET_DIR / "processed" / "capacity_training.csv"
TARGET = "hydrogen_capacity_wt_pct"
GROUP_COLUMN = "source_id"
METADATA_COLUMNS = (
    "measurement_id",
    "sample_id",
    "source_id",
    "paper_id",
    "experiment_group_id",
    "catalyst_system_group",
    "source_pdf_page",
    "source_locator",
    "extraction_type",
)
REQUIRED_COLUMNS = {
    *METADATA_COLUMNS,
    TARGET,
    "measurement_mode",
    "temperature_c",
    "duration_seconds",
    "value_qualifier",
}
NUMERIC_COLUMNS = (
    "catalyst_loading_wt_pct",
    "milling_time_h",
    "milling_speed_rpm",
    "temperature_c",
    "pressure_bar",
    "duration_seconds",
    TARGET,
)
CANONICAL_CSVS = (
    "sources.csv",
    "samples.csv",
    "measurements.csv",
    "activation_energies.csv",
    "cycling.csv",
    "thermal_events.csv",
)


def sha256_file(path: Path = CAPACITY_CSV) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def audit_whitespace_only(dataset_dir: Path = DATASET_DIR) -> list[dict[str, object]]:
    findings: list[dict[str, object]] = []
    for name in CANONICAL_CSVS:
        frame = pd.read_csv(dataset_dir / name, dtype=str, keep_default_na=False)
        for row_index, row in frame.iterrows():
            identifier = str(row.iloc[0])
            for field, value in row.items():
                if value != "" and str(value).strip() == "":
                    findings.append(
                        {
                            "file": name,
                            "csv_row": int(row_index) + 2,
                            "id": identifier,
                            "field": field,
                        }
                    )
    return findings


def validate_training_frame(frame: pd.DataFrame, dataset_dir: Path = DATASET_DIR) -> None:
    missing_columns = REQUIRED_COLUMNS.difference(frame.columns)
    if missing_columns:
        raise ValueError(f"Training data is missing columns: {sorted(missing_columns)}")
    whitespace = [
        column
        for column in frame.select_dtypes(include="object").columns
        if frame[column].map(lambda value: isinstance(value, str) and value != "" and value.strip() == "").any()
    ]
    if whitespace:
        raise ValueError(f"Whitespace-only fields are forbidden: {sorted(whitespace)}")
    if frame["measurement_id"].duplicated().any():
        raise ValueError("measurement_id must be unique")
    if not frame["measurement_mode"].isin(("absorption", "desorption")).all():
        raise ValueError("Cycling or non-capacity measurement mode reached Model 1")
    if not frame["extraction_type"].eq("author_reported_text").all():
        raise ValueError("Only author-reported capacity observations are eligible")
    forbidden = frame.astype(str).apply(
        lambda column: column.str.contains(r"synthetic|demo|seed_data|phase[_ -]?3", case=False, regex=True)
    )
    if forbidden.to_numpy().any():
        raise ValueError("Phase 3 synthetic/demo content is forbidden")

    sources = pd.read_csv(dataset_dir / "sources.csv", dtype=str, keep_default_na=False)
    allowed = set(
        sources.loc[
            sources["dataset_scope"].eq("core_mgh2")
            & sources["included_in_capacity_training"].eq("true"),
            "source_id",
        ]
    )
    disallowed = sorted(set(frame["source_id"]).difference(allowed))
    if disallowed:
        raise ValueError(f"Ineligible or extended sources reached training: {disallowed}")

    cycling = pd.read_csv(dataset_dir / "cycling.csv", dtype=str, keep_default_na=False)
    if set(frame["measurement_id"]).intersection(cycling["cycling_id"]):
        raise ValueError("Cycling observations reached Model 1")

    for column in ("temperature_c", "duration_seconds", TARGET):
        values = pd.to_numeric(frame[column], errors="coerce")
        if values.isna().any() or not np.isfinite(values).all() or (values < 0).any():
            raise ValueError(f"Invalid required numeric field: {column}")


def load_capacity_data(path: Path = CAPACITY_CSV) -> pd.DataFrame:
    frame = pd.read_csv(path, dtype=str, keep_default_na=False)
    validate_training_frame(frame, path.parents[1])
    for column in NUMERIC_COLUMNS:
        frame[column] = pd.to_numeric(frame[column].replace("", np.nan), errors="raise")
    return frame


def logo_splits(frame: pd.DataFrame, group_column: str = GROUP_COLUMN) -> Iterator[tuple[np.ndarray, np.ndarray]]:
    splitter = LeaveOneGroupOut()
    groups = frame[group_column].to_numpy()
    for train_index, test_index in splitter.split(frame, frame[TARGET], groups):
        if set(groups[train_index]).intersection(groups[test_index]):
            raise AssertionError("A group appeared in both training and test")
        yield train_index, test_index


def prediction_input_from_row(row: pd.Series) -> dict[str, object]:
    fields = (
        "catalyst_family",
        "catalyst_elements",
        "support_material",
        "catalyst_loading_wt_pct",
        "preparation_method",
        "milling_time_h",
        "milling_speed_rpm",
        "ball_to_powder_ratio",
        "measurement_mode",
        "temperature_c",
        "pressure_bar",
        "pressure_relation",
        "duration_seconds",
        "catalyst_additive",
        "catalyst_composition",
        "catalyst_components",
    )
    result: dict[str, object] = {}
    for field in fields:
        value = row.get(field, "")
        if pd.isna(value) or value == "":
            result[field] = None
        elif isinstance(value, np.generic):
            result[field] = value.item()
        else:
            result[field] = value
    return result
