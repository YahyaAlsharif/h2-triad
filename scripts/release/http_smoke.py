"""Read-only scientific API checks against an already running local application."""

import json
import sys
from urllib.request import Request, urlopen


def check(base):
    def request(path, payload=None):
        data = None if payload is None else json.dumps(payload).encode()
        with urlopen(Request(base + path, data=data, headers={"Content-Type": "application/json"}), timeout=30) as response:
            return json.load(response)

    assert request("/health")["status"] == "ok"
    assert request("/scientific/readiness")["status"] == "ready"
    items = request("/literature/measurements")["items"]
    assert len(items) == 119
    threshold = next(item for item in items if item["measurement_id"] == "M-0082")
    literature = request("/digital-twin/run", {"inputs": threshold["inputs"]})
    assert literature["status"] == "literature"
    assert any(item["hydrogen_capacity_wt_pct"] == 4.21 and item["value_qualifier"] == "greater_than" for item in literature["items"])
    inputs = request("/digital-twin/options")["default_inputs"]
    result = request("/digital-twin/run", {"inputs": inputs})
    assert result["status"] == "predicted"
    assert result["prediction"]["hydrogen_capacity_wt_pct"] == 3.6083
    assert result["prediction"]["empirical_interval_90_wt_pct"] == [1.1628, 6.6989]
    unavailable = request("/digital-twin/run", {"inputs": {**inputs, "temperature_c": 999}})
    assert unavailable["status"] == "unavailable" and unavailable["prediction"] is None
    landscape = request("/digital-twin/landscape", {"inputs": inputs})
    assert landscape["supported_cells"] == 400
    assert len(landscape["z"]) == 20 and all(len(row) == 20 for row in landscape["z"])
    print(f"PASS {base}: health/readiness, 119 observations, threshold literature, frozen prediction/interval, unavailable, 400-cell landscape")


if __name__ == "__main__":
    for base in sys.argv[1:] or ["http://localhost:8000/api", "http://localhost:5173/api"]:
        check(base.rstrip("/"))
