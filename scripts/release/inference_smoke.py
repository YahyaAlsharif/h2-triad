"""Frozen Phase 5 inference fixtures; no fitting, network, or database writes."""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from app.literature import LiteratureIndex
from model.predict import predict_capacity


def main():
    evidence = LiteratureIndex()
    assert len(evidence.items) == 119
    default = next(item for item in evidence.items if item.inputs.measurement_mode == "absorption"
                   and item.inputs.temperature_c is not None and item.inputs.pressure_bar is not None)
    payload = default.inputs.model_dump(exclude={"sample_id", "base_material", "temperature_reported"})
    payload["preparation_method"] = None
    result = predict_capacity(payload)
    assert result["status"] == "predicted"
    assert result["prediction"]["hydrogen_capacity_wt_pct"] == 3.6083
    assert result["prediction"]["empirical_interval_90_wt_pct"] == [1.1628, 6.6989]
    for change in ({"temperature_c": 999}, {"duration_seconds": "invalid"}):
        invalid = predict_capacity({**payload, **change})
        assert invalid["status"] == "unavailable" and invalid["prediction"] is None
    cli = subprocess.run([sys.executable, str(ROOT / "model/predict.py")],
                         input=json.dumps(payload), text=True, capture_output=True, check=True)
    assert json.loads(cli.stdout) == result
    print("PASS: 119 literature records; Phase 5 prediction/interval; unsupported and malformed inputs; standalone CLI parity")


if __name__ == "__main__":
    main()
