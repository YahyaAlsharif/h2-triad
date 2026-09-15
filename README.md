# H2-TRIAD

A literature-backed hydrogen materials workspace. **Phase 5 integrates the completed Phase 4B capacity model into the React/FastAPI Digital Twin.**

The scientific result hierarchy is:

**Exact literature measurement → supported AI prediction → unavailable.**

Literature values retain provenance and qualifiers such as approximately or greater than. AI results display the model identity, support warnings, and empirical 90% interval when available. Unsupported configurations receive no fabricated capacity.

## Digital Twin

Configure an MgH2 absorption/desorption experiment using temperature, duration, catalyst loading, chemistry, support material, and pressure. An optional collapsed literature selector loads a verified sample and its reported conditions. Custom inputs remain the default experience.

The interactive 3D landscape sweeps **temperature × catalyst loading**, with **predicted H2 capacity** on the vertical axis. Other inputs stay fixed. A single backend request validates the grid and batches supported nodes through the existing model. Unsupported cells stay empty. The selected prediction, intervals, support notes, reset-view control, and accessible data table remain visible.

This is a **model response landscape**, not a molecular/physical simulation, causal result, or experimentally verified continuous surface. Predictions support research prioritization and educational exploration; they are not certified laboratory results.

The historical Phase 3 SQLite records remain in a separately labeled **Synthetic/demo explorer**. They never supply scientific Twin results or model training data.

## Architecture

```text
React → /api (Vite proxy) → FastAPI
                            ├─ Canonical Phase 4 literature index
                            ├─ Cached Phase 4B predictor → batched landscape
                            └─ SQLite synthetic/demo explorer
```

The model's checked-in artifact serializes preprocessing and estimation together. Application startup loads one reusable predictor per process; it does not train or duplicate the artifact. The standalone `model/predict.py` API and CLI remain supported.

### Scientific evidence

- 119 core literature capacity observations are accessible, including approximate/threshold values and nine observations with only a reported room temperature.
- The model was trained on 109 scalar observations from 16 papers and 36 samples.
- Exact matching preserves sample identity, conditions, pressure qualifiers, missingness, and source provenance. Missing values never act as wildcards.
- Room temperature is not assigned an invented numeric value. Such literature can be retrieved as reported; numerical exploration requires new numeric conditions.
- Model support uses the existing mode-specific ranges and chemistry checks. It does not establish experimental coverage of every combination inside those ranges.
- Empirical 90% intervals achieved 86.2% observed paper-held-out coverage and are broad. They are not confidence scores or guarantees.

See [Phase 5 architecture and scientific boundaries](docs/phase-5-ai-integration.md), the [model card](model/MODEL_CARD.md), and the historical [Phase 4B evaluation](docs/phase-4b-capacity-model.md).

## Structure

```text
backend/app/
  main.py                 # Lifecycle, safe errors, existing health contract
  scientific.py           # Literature-first runs, model readiness, batched grids
  scientific_schemas.py   # Scientific request/result contracts
  literature.py           # Read-only canonical literature index
  database.py             # Persistent historical SQLite demo data
  domain.py, repository.py # Demo records and options
frontend/src/
  components/DigitalTwin.jsx         # Custom form and scientific results
  components/PredictionLandscape.jsx # Grid requests, status and data table
  components/SurfaceView.jsx         # Lazy graphics loading and retry
  components/PlotSurface.jsx         # Plotly surface and selected prediction
  data/scientificService.js          # Scientific HTTP response validation
model/
  predict.py              # Standalone and reusable batch inference
  src/                    # Existing preprocessing, support and training modules
  artifacts/              # One fitted model, metadata and support profile
data/phase4_dataset/       # Canonical and processed literature-derived tables
```

Historical [Phase 2](docs/phase-2-frontend.md), [Phase 3](docs/phase-3-domain-backend.md), and [Phase 4A](docs/phase-4a-scientific-dataset.md) documents remain delivery records for those phases.

## Local development

Prerequisites: Python **3.10**, Node.js 24+, npm, and Google Chrome for the default browser tests. The evaluated model environment is Python 3.10.11. Do not reuse a Python 3.13/3.14 backend environment for the pinned model runtime.

From the repository root, create an integrated environment if needed:

```powershell
py -3.10 -m venv model/.venv
model/.venv/Scripts/python.exe -m pip install -r model/requirements.txt
model/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
model/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --reload
```

The development requirements use different pytest pins; install them in the order above for the integrated test environment. Inference dependency versions agree.

For runtime only, install `backend/requirements.txt`, which includes `model/requirements-inference.txt`. On macOS/Linux use a Python 3.10 executable and `model/.venv/bin/python`.

In a second terminal:

```powershell
npm.cmd ci --prefix frontend
npm.cmd run dev --prefix frontend
```

Use `npm` instead of `npm.cmd` outside Windows. The frontend proxy defaults to `http://localhost:8000`; `VITE_API_PROXY_TARGET` overrides it. No environment file is required for defaults.

Local `DATABASE_PATH` overrides the SQLite path; relative paths still resolve from `backend/`. The scientific CSVs are read from the repository independently of the database.

## Docker — local integration

```powershell
docker compose config --quiet
docker compose up --build -d
```

The backend image uses Python 3.10 and includes the model code, inference dependencies, artifact, support metadata, and scientific CSVs under `/opt/h2-triad`. The existing `backend_data` volume remains mounted at `/app/data` and preserves SQLite records. Source PDFs and local virtual environments are excluded from the build.

`SEED_DEMO_DATA=false` disables demo seeding only when a new database is initialized; it never removes existing records. Rebuilds/restarts do not reseed or overwrite the database. Keep any Compose `DATABASE_PATH` override inside `/app/data` for persistence.

The frontend still uses the existing Vite container workflow. Hosting, production static serving, public-release cleanup, licensing, and deployment remain Phase 6 concerns.

## URLs and API

| URL | Purpose |
| --- | --- |
| <http://localhost:5173> | Dashboard |
| <http://localhost:8000/docs> | Interactive API contracts |
| <http://localhost:8000/api/health> | Existing API/SQLite connectivity |
| <http://localhost:8000/api/scientific/readiness> | Model and literature readiness |
| <http://localhost:8000/api/digital-twin/options> | Scientific defaults, support profile and model metadata |
| <http://localhost:8000/api/literature/measurements> | Verified core capacity evidence |
| <http://localhost:8000/api/experiments> | Historical synthetic/demo records |

`POST /api/digital-twin/run` accepts `{ "inputs": { ... } }` and returns `literature`, `predicted`, or `unavailable`. Exact evidence requires matching verified sample context; matching model features alone cannot establish that a custom specimen is the literature sample. All malformed requests fail before inference. Service failures remain distinguishable from unsupported-domain results.

`POST /api/digital-twin/landscape` accepts the fixed inputs, X/Y variable names, and grid resolution. The default is 20 × 20; each axis permits 2–40 points. Responses include predictions, empirical intervals, masks, reasons/warnings, model metadata, and the actual selected-point prediction.

## Validation

From the repository root:

```powershell
model/.venv/Scripts/python.exe -m pytest model/tests -q
model/.venv/Scripts/python.exe -m pytest backend -q
model/.venv/Scripts/python.exe model/predict.py --help
npm.cmd run lint --prefix frontend
npm.cmd run format:check --prefix frontend
npm.cmd run build --prefix frontend
npm.cmd test --prefix frontend
```

The model tests include in-memory artifact reproducibility checks. Do not run `model/train.py` for ordinary integration validation: it regenerates evaluation/artifact files and is unnecessary for Phase 5.

Browser tests launch an isolated temporary-database backend on port **8001** and Vite on **5174**. They use `model/.venv` by default; `PLAYWRIGHT_PYTHON` overrides the interpreter. The default browser is installed Chrome; use `PLAYWRIGHT_CHANNEL=chromium` with an installed Playwright Chromium if needed. Only theme preference uses localStorage.

To exercise the running Compose application:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://localhost:5173'
npm.cmd test --prefix frontend -- --output=test-results/compose
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Tests never edit the running demo database. Browser screenshots/traces remain in ignored `frontend/test-results/`. See [Phase 5 validation](docs/phase-5-ai-integration.md#validation) for results and known limitations.

Phase 4A dataset regeneration/validation remains available under `scripts/phase4`; its historical workflow and lineage checks are documented in the Phase 4A delivery record.

## Remaining work

The Activation Energy Predictor remains deferred. Phase 6 owns release and licensing decisions, reproducibility/security audit, hosting and production serving, deployment, and submission packaging. Phase 5 does not claim external laboratory validation or establish scientific superiority between configurations.
