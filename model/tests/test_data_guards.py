from __future__ import annotations

import pandas as pd
import pytest

from src.data import CAPACITY_CSV, audit_whitespace_only, load_capacity_data, logo_splits, validate_training_frame


def test_phase4_canonical_csvs_have_no_whitespace_only_cells():
    assert audit_whitespace_only() == []


def test_training_validation_rejects_whitespace_only_fields():
    frame = pd.read_csv(CAPACITY_CSV, dtype=str, keep_default_na=False)
    frame.loc[0, "catalyst_family"] = " "
    with pytest.raises(ValueError, match="Whitespace-only"):
        validate_training_frame(frame)


def test_phase3_synthetic_data_cannot_enter_training():
    frame = pd.read_csv(CAPACITY_CSV, dtype=str, keep_default_na=False)
    frame.loc[0, "source_id"] = "PHASE3-DEMO"
    with pytest.raises(ValueError, match="Phase 3|Ineligible"):
        validate_training_frame(frame)


def test_extended_reactive_composite_cannot_enter_training():
    frame = pd.read_csv(CAPACITY_CSV, dtype=str, keep_default_na=False)
    frame.loc[0, "source_id"] = "SRC-0018"
    with pytest.raises(ValueError, match="Ineligible or extended"):
        validate_training_frame(frame)


def test_cycling_data_cannot_enter_model_one():
    frame = pd.read_csv(CAPACITY_CSV, dtype=str, keep_default_na=False)
    frame.loc[0, "measurement_id"] = "CY-0001"
    with pytest.raises(ValueError, match="Cycling"):
        validate_training_frame(frame)


def test_source_groups_never_cross_a_fold_boundary():
    frame = load_capacity_data()
    for train_index, test_index in logo_splits(frame):
        assert set(frame.iloc[train_index]["source_id"]).isdisjoint(frame.iloc[test_index]["source_id"])
