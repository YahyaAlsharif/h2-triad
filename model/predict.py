from __future__ import annotations

import argparse
import json
import sys
import math
from pathlib import Path
from typing import Any

import pandas as pd

if __package__:
    from . import src as _src
    from .src import features as _features
    from .src import modeling as _modeling
    from .src import support as _support

    # The checked-in artifact was created by the standalone training script,
    # where these modules are named ``src.*``. Preserve those import names so
    # joblib can load the same artifact when Phase 5 imports ``model.predict``.
    sys.modules.setdefault("src", _src)
    sys.modules.setdefault("src.features", _features)
    sys.modules.setdefault("src.modeling", _modeling)
    sys.modules.setdefault("src.support", _support)
    load_bundle = _modeling.load_bundle
    validate_support = _support.validate_support
else:
    from src.modeling import load_bundle
    from src.support import validate_support


DEFAULT_ARTIFACT = Path(__file__).resolve().parent / "artifacts" / "capacity_model.joblib"


def _prediction_result(bundle, normalized, prediction, warnings):
    prediction = float(prediction)
    if not math.isfinite(prediction):
        raise ValueError("The model returned a non-finite prediction")
    prediction_payload: dict[str, Any] = {"hydrogen_capacity_wt_pct": round(prediction, 4)}
    if bundle.interval_quantiles:
        mode = str(normalized["measurement_mode"])
        quantiles = bundle.interval_quantiles.get(mode, bundle.interval_quantiles.get("pooled"))
        if quantiles:
            lower = max(0.0, prediction + float(quantiles[0]))
            upper = prediction + float(quantiles[1])
            prediction_payload["empirical_interval_90_wt_pct"] = [round(lower, 4), round(upper, 4)]
    return {
        "status": "predicted",
        "model_id": bundle.model_id,
        "prediction": prediction_payload,
        "support": {"supported": True, "warnings": warnings},
    }


class CapacityPredictor:
    """Reusable inference session. No fitting or artifact mutation occurs here."""

    def __init__(self, artifact_path: Path = DEFAULT_ARTIFACT):
        self.bundle = load_bundle(Path(artifact_path))

    def predict_many(self, payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
        results = []
        rows = []
        positions = []
        row_warnings = []
        for payload in payloads:
            if not isinstance(payload, dict):
                results.append({
                    "status": "unavailable", "reason": "malformed_input", "prediction": None,
                    "support": {"supported": False, "reasons": ["input_must_be_an_object"]},
                })
                continue
            supported, reasons, warnings, normalized = validate_support(payload, self.bundle.support_profile)
            if not supported:
                results.append({
                    "status": "unavailable", "reason": "outside_model_support", "prediction": None,
                    "support": {"supported": False, "reasons": reasons, "warnings": warnings},
                })
                continue
            positions.append(len(results))
            rows.append(normalized)
            row_warnings.append(warnings)
            results.append(None)
        if rows:
            predictions = self.bundle.predict(pd.DataFrame(rows))
            if len(predictions) != len(rows):
                raise ValueError("The model returned an unexpected row count")
            for index, row, prediction, warnings in zip(positions, rows, predictions, row_warnings):
                results[index] = _prediction_result(self.bundle, row, prediction, warnings)
        return results

    def predict(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.predict_many([payload])[0]


def predict_capacity(payload: dict[str, Any], artifact_path: Path = DEFAULT_ARTIFACT) -> dict[str, Any]:
    # Preserve the standalone interface; applications retain a CapacityPredictor.
    if not isinstance(payload, dict):
        return {
            "status": "unavailable", "reason": "malformed_input", "prediction": None,
            "support": {"supported": False, "reasons": ["input_must_be_an_object"]},
        }
    return CapacityPredictor(artifact_path).predict(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description="Offline H2-TRIAD capacity inference")
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--input", help="JSON object")
    source.add_argument("--file", type=Path, help="Path to a JSON input file")
    parser.add_argument("--artifact", type=Path, default=DEFAULT_ARTIFACT)
    args = parser.parse_args()
    try:
        if args.input:
            payload = json.loads(args.input)
        elif args.file:
            payload = json.loads(args.file.read_text(encoding="utf-8"))
        else:
            payload = json.load(sys.stdin)
        result = predict_capacity(payload, args.artifact)
    except (json.JSONDecodeError, OSError, ValueError, TypeError) as error:
        result = {
            "status": "unavailable",
            "reason": "malformed_input",
            "prediction": None,
            "support": {"supported": False, "reasons": [str(error)]},
        }
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
