# H2-TRIAD

Hydrogen materials workspace. Phase 4A provides a verified literature-derived scientific dataset; the running React/FastAPI/SQLite application remains the separate Phase 3 demonstration system.

**All current records are synthetic/demo data. No trained model exists.** The Digital Twin performs an exact lookup of stored experiments. Unsupported configurations return no invented values. No interpolation, extrapolation, chemistry formulas, training, or inference is implemented.

## Phase 4A scientific dataset

Literature acquisition was completed on 2026-09-13 and FREE-17 was subsequently supplied and verified on 2026-09-14. Verified papers live under [data/phase4_data_sources/](data/phase4_data_sources/), with core primary, extended reactive-composite, review/methodology, supplementary, and non-training project sources kept separate. Unavailable papers remain in the [active missing-paper queue](data/phase4_data_sources/acquisition/papers_no_pdf.txt).

The normalized canonical tables and deterministic Model 1 input artifacts are under [data/phase4_dataset/](data/phase4_dataset/). The default capacity table has 109 author-reported observations from 16 core papers. Cycling and extended reactive-composite observations are excluded from it. No graph values were digitized and no model was trained. Phase 3 synthetic/demo SQLite records remain separate and must never be used as scientific training data.

## Architecture

```text
React dashboard → /api HTTP requests → Vite proxy → FastAPI → SQLite
```

The backend owns experiment records, selectable domain options, numeric constraints, defaults, validation, and provenance. The frontend owns presentation and transient interaction state. Charts, comparisons, and overview statistics use API-returned records. Only theme preference uses localStorage.

The twelve Phase 2 experiment records are preserved in the backend seed file. The four conflicting prediction fixtures, synthetic confidence, and unsubstantiated desorption outputs have been retired. The default Ni configuration now consistently returns the stored capacity of 6.1 wt%.

## Structure

```text
backend/
  app/
    main.py          # Application lifecycle, health and safe errors
    database.py      # Connections and transactional schema/seed initialization
    schemas.py       # Pydantic contracts
    repository.py    # Database reads and option discovery
    domain.py        # Domain routes and exact lookup validation
    seed_data.json   # Canonical synthetic/demo seed records
  tests/             # Isolated temporary SQLite tests
  data/              # Ignored local runtime database
frontend/
  src/
    data/dashboardService.js  # HTTP adapter and response validation
    data/analysis.js          # Condition-aware display grouping
    components/               # Dashboard UI
  tests/                      # Playwright, contracts, axe, test backend launcher
docs/
  phase-2-frontend.md
  phase-3-domain-backend.md
  phase-4a-scientific-dataset.md
data/
  phase4_data_sources/       # Verified literature corpus and acquisition records
  phase4_dataset/            # Canonical scientific tables and derived capacity data
scripts/phase4/              # Deterministic builder and validation suite
```

See [Phase 4A scientific dataset](docs/phase-4a-scientific-dataset.md) for extraction scope, normalized schema, validation, limitations, and the Phase 4B handoff. [Phase 3 implementation and validation](docs/phase-3-domain-backend.md) remains the historical application delivery record. The standalone HTML prototype, research report, and STYLE.md remain historical references; the dashboard retains the Phase 2 teal design.

## Prerequisites

- Node.js 24+ and npm
- Python 3.11+
- Docker Desktop with Compose for the container workflow
- Google Chrome for the default browser tests, or installed Playwright Chromium

## Local development

Start the backend:

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux instead: source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

If the Windows `python` command opens the Store, use your installed Python launcher to create the environment; thereafter use `.\.venv\Scripts\python.exe` explicitly.

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Use `npm.cmd` on Windows if PowerShell blocks npm scripts. No environment file is required for defaults. Local `DATABASE_PATH` overrides the database path; relative paths resolve from `backend/`. `VITE_API_PROXY_TARGET` defaults to `http://localhost:8000`.

## Docker

From the repository root:

```bash
docker compose up --build
```

Compose uses the existing `backend_data` volume at `/app/data`. Restarting or rebuilding services preserves SQLite records. `docker compose down` preserves the volume; `docker compose down --volumes` intentionally deletes it.

The optional root `.env` file is read by Compose. Copy `.env.example` only to override defaults. Keep a Compose `DATABASE_PATH` override inside `/app/data` to retain volume persistence.

## Initialization and demo data

Startup creates schema version 1 and, by default, inserts the twelve demo records in one transaction. An existing empty Phase 1 database upgrades automatically. Subsequent starts read SQLite and never overwrite or reseed existing records, even if all records have been removed.

Set `SEED_DEMO_DATA=false` **before first initialization** to create an empty database. This does not remove seeds from an already initialized database. Changing `seed_data.json` does not modify existing runtime databases. A future data replacement must be explicit; no ingestion or editing system is included in Phase 3.

## URLs and API

| URL | Purpose |
| --- | --- |
| <http://localhost:5173> | Dashboard |
| <http://localhost:8000> | Backend origin; domain routes are below |
| <http://localhost:8000/docs> | Interactive API documentation |
| <http://localhost:8000/api/health> | Existing API/SQLite connectivity contract |
| <http://localhost:8000/api/experiments> | Stored dataset |
| <http://localhost:8000/api/experiments/EXP-003> | One stored experiment |
| <http://localhost:8000/api/domain/options> | Form options, constraints, and stored defaults |

`POST /api/digital-twin/run` accepts `{ "inputs": { ... } }` with the eight configuration fields. It returns `status: "matched"` and all exact matching experiment records, or `status: "unavailable"`, `reason: "no_exact_match"`, and an empty `items` array.

The health endpoint preserves its `200` connected / `503` disconnected responses and verifies a live SQLite connection. It is a connectivity check, not a domain-schema readiness assertion. Domain failures return safe errors independently.

## Validation

Phase 4A dataset, from the repository root:

```bash
npm install --prefix scripts/phase4
npm run build --prefix scripts/phase4
npm test --prefix scripts/phase4
```

This regenerates both processed formats from canonical tables and verifies IDs, foreign keys, provenance, source PDFs, synthetic-data exclusion, leakage metadata, deterministic output, and CSV/Parquet equivalence.

Backend, from `backend/`:

```bash
python -m pytest
# Windows without activation:
.\.venv\Scripts\python.exe -m pytest
```

Frontend, from `frontend/`:

```bash
npm run lint
npm run format:check
npm run build
npm test
```

Local `npm test` starts its own backend on **8001**, backed by a temporary SQLite database, and Vite on **5174**, which proxies to that backend. It does not require the development backend and never opens the developer's runtime database. Both ports must be available. The launcher uses `backend/.venv` when present; override with `PLAYWRIGHT_PYTHON` if needed.

The default browser is installed Google Chrome. To use Playwright Chromium, run `npx playwright install chromium` and set `PLAYWRIGHT_CHANNEL=chromium`.

To run against the Compose demo application, in PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://localhost:5173'
npm.cmd test -- --output=test-results/compose
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

The Compose browser suite reads the application's demo database; it does not edit it. Corrupt responses and duplicate observations are injected only in tests. Screenshots/traces are under ignored `frontend/test-results/`. `npm run test:ui` starts the interactive runner.

From the repository root:

```bash
docker compose config --quiet
docker compose up --build -d
```

Phase 3 verification covers backend persistence and validation, real HTTP integration, retry/empty/error states, condition-aware analysis, both themes, keyboard/reduced-motion behavior, axe checks, and six viewport widths. See the delivery report for exact results.

## Scientific boundaries

Cohorts match material, loading, pressure, preparation, milling, particle size, and measurement mode/duration/basis. Temperature varies on the axis; additives define series. Source identity does not split otherwise compatible observations. Every chart observation retains provenance, including duplicate points.

Input bounds and form applicability flags are illustrative application conventions, not laboratory operating limits. Stored outcome labels are synthetic categories, not calculated judgments. No configuration or comparison establishes scientific superiority.

Phase 4A is complete. Phase 4B owns model development: the mandatory H2 Capacity Predictor must benchmark suitable tabular regressors with paper-grouped validation, while the Activation Energy Predictor is deferred by the Phase 4A evidence. Phase 5 owns AI/application integration and the approved 3D prediction landscape plus educational material schematic. Phase 6 owns release, licensing, deployment, reproducibility/security audit, and submission packaging. None of Phase 4B through Phase 6 is implemented here.
