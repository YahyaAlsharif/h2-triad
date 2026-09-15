from __future__ import annotations

import json
import math
import socket
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

from predict import predict_capacity
from src.data import TARGET, load_capacity_data, prediction_input_from_row, sha256_file
from src.features import feature_config
from src.modeling import load_bundle, make_pipeline


MODEL_DIR = Path(__file__).resolve().parents[1]
ARTIFACT = MODEL_DIR / "artifacts" / "capacity_model.joblib"
METADATA = MODEL_DIR / "artifacts" / "model_metadata.json"


def supported_payload() -> dict[str, object]:
    frame = load_capacity_data()
    row = frame.loc[frame["catalyst_family"].ne("none")].iloc[0]
    return prediction_input_from_row(row)


@pytest.mark.refit
def test_saved_artifact_reload_matches_retrained_in_memory_model():
    frame = load_capacity_data()
    bundle = load_bundle(ARTIFACT)
    config = feature_config(bundle.feature_config)
    model_name = bundle.metadata.get(
        "algorithm_key", "catboost" if bundle.algorithm == "CatBoostRegressor" else "random_forest"
    )
    pipeline = make_pipeline(config, model_name, bundle.metadata["final_hyperparameters"])
    pipeline.fit(frame, frame[TARGET])
    sample = frame.iloc[[1]]
    np.testing.assert_allclose(bundle.predict(sample), pipeline.predict(sample), rtol=0, atol=1e-12)


def test_supported_prediction_is_finite_and_handles_missing_pressure():
    payload = supported_payload()
    payload["pressure_bar"] = None
    result = predict_capacity(payload)
    assert result["status"] == "predicted"
    assert math.isfinite(result["prediction"]["hydrogen_capacity_wt_pct"])
    assert "pressure_bar_missing" in result["support"]["warnings"]


def test_unseen_exact_catalyst_name_is_not_automatically_rejected():
    payload = supported_payload()
    payload["catalyst_additive"] = "unseen-name-with-supported-family"
    result = predict_capacity(payload)
    assert result["status"] == "predicted"


def test_unsupported_input_has_no_numeric_prediction():
    payload = supported_payload()
    payload["temperature_c"] = 999
    result = predict_capacity(payload)
    assert result["status"] == "unavailable"
    assert result["prediction"] is None


def test_malformed_input_fails_safely():
    payload = supported_payload()
    payload["duration_seconds"] = "not-a-number"
    result = predict_capacity(payload)
    assert result["status"] == "unavailable"
    assert result["prediction"] is None


def test_missing_components_fail_safely_for_a_catalyst():
    payload = supported_payload()
    payload["catalyst_components"] = None
    result = predict_capacity(payload)
    assert result["status"] == "unavailable"
    assert "missing_catalyst_components" in result["support"]["reasons"]


def test_dataset_fingerprint_matches_metadata():
    metadata = json.loads(METADATA.read_text(encoding="utf-8"))
    assert metadata["dataset_sha256"] == sha256_file()


def test_model_metadata_matches_artifact():
    metadata = json.loads(METADATA.read_text(encoding="utf-8"))
    bundle = load_bundle(ARTIFACT)
    assert bundle.model_id == metadata["model_id"]
    assert bundle.algorithm == metadata["algorithm"]
    assert bundle.feature_config == metadata["feature_set"]
    assert bundle.metadata["dataset_sha256"] == metadata["dataset_sha256"]


def test_inference_requires_no_network(monkeypatch):
    def forbidden_socket(*args, **kwargs):
        raise AssertionError("network access attempted")

    monkeypatch.setattr(socket, "socket", forbidden_socket)
    assert predict_capacity(supported_payload())["status"] == "predicted"


def test_repository_root_package_import_is_phase5_ready():
    payload = supported_payload()
    command = (
        "from model.predict import predict_capacity; "
        f"result = predict_capacity({payload!r}); "
        "assert result['status'] == 'predicted'; "
        "print('package-import-ok')"
    )
    completed = subprocess.run(
        [sys.executable, "-c", command],
        cwd=MODEL_DIR.parent,
        check=True,
        capture_output=True,
        text=True,
    )
    assert completed.stdout.strip() == "package-import-ok"
