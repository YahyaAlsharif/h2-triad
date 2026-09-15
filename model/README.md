# H2-TRIAD capacity model

This directory contains the standalone Phase 4B hydrogen-capacity predictor. It is deliberately not connected to FastAPI or React. Phase 5 can import `predict_capacity` from `predict.py` and preserve the product order: exact literature measurement, supported AI prediction, unavailable.

## Reproducible environment

The evaluated environment is Python 3.10 with exact dependencies in `requirements.txt`. Runtime-only dependencies are in `requirements-inference.txt`.

```powershell
python -m venv model/.venv
model/.venv/Scripts/python.exe -m pip install -r model/requirements.txt
model/.venv/Scripts/python.exe model/train.py
model/.venv/Scripts/python.exe -m pytest model/tests -q
```

`train.py` repeats the leakage-safe leave-one-source-out progression, nested grouped tuning, sensitivity tests, ablations, learning curve, ensemble experiment, uncertainty calibration, final full-data fit, and plot generation. It overwrites generated files under `model/evaluation/` and `model/artifacts/`; it does not alter application data.

For the fixed initial ladder only:

```powershell
model/.venv/Scripts/python.exe model/evaluate.py --initial
```

## Offline inference

The CLI accepts a JSON object with `--input`, a JSON file with `--file`, or JSON on standard input. All support checks occur before prediction.

```powershell
[ordered]@{
  measurement_mode = 'absorption'
  temperature_c = 250
  pressure_bar = 30
  duration_seconds = 3600
  catalyst_loading_wt_pct = 5
  catalyst_family = 'bimetallic_oxide'
  catalyst_elements = 'Ni|Zn|O'
  catalyst_components = 'NiO|ZnO'
  support_material = $null
} | ConvertTo-Json -Compress | model/.venv/Scripts/python.exe model/predict.py
```

Application code should use the same function rather than reproduce preprocessing:

```python
from model.predict import predict_capacity

result = predict_capacity(payload)
```

Successful calls return `status: predicted`, a capacity in wt.% H2, an empirical interval when enabled, and support warnings. Clearly unsupported or malformed inputs return `status: unavailable`, `prediction: null`, and auditable reasons.

## Contract and artifacts

- `artifacts/capacity_model.joblib`: preprocessing and fitted CatBoost estimator in one bundle.
- `artifacts/model_metadata.json`: feature contract, versions, dataset fingerprint, and official held-out metrics.
- `artifacts/support_profile.json`: mode-specific numeric ranges and chemistry vocabularies.
- `evaluation/leaderboard.csv`: complete permanent experiment leaderboard.
- `evaluation/oof_predictions.csv`: one source-held-out prediction per eligible observation.
- `evaluation/metrics.json`: machine-readable final results and sensitivities.
- `evaluation/plots/`: diagnostic figures generated without interactive dependencies.

The model needs no network access. Official performance always refers to paper-held-out out-of-fold predictions; the final fit on all 109 rows is only the deployment artifact.
