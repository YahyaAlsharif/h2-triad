# Phase 5: AI integration and scientific prediction landscape

> Historical delivery record. See the [current project README](../README.md) and [release/source rights](licensing-and-data.md) for the current checkout.

## Result hierarchy

The Digital Twin implements **exact literature measurement → supported AI prediction → unavailable**. It never searches the Phase 3 synthetic SQLite table for a scientific result.

The main form describes a custom MgH2 configuration. Its optional, collapsed literature loader supplies a reported sample and conditions. A sample ID preserves preparation and identity context that the model feature vector cannot identify. The backend checks every submitted scientific input against the canonical observation; an ID cannot override a changed condition. Missing pressure or loading never acts as a wildcard. Numeric comparisons use exact normalized values, without nearest-match tolerance. Different matching observations are returned separately, never averaged.

The read-only literature index joins `sources.csv`, `samples.csv`, and `measurements.csv`. It includes all 119 ordinary absorption/desorption observations from verified core MgH2 sources, rather than only the 109 scalar model-training rows. Approximate values retain their qualifier; a threshold such as `greater_than` remains `>`, not an exact scalar capacity. All source qualifiers remain in the response, with unknown qualifier names displayed rather than silently dropped. The nine observations with only a reported room temperature retain that text; no Celsius value is invented. Their exact reported configurations remain retrievable, but a landscape requires numeric conditions. Extended reactive composites, cycling, thermal events, and activation-energy measurements remain outside this Twin's material/target scope.

Results preserve measurement/sample/source identity, capacity basis, reported uncertainty when present, DOI/title/year, PDF page and locator, extraction notes, raw conditions, and preparation context. The API does not serve source PDFs.

## Backend and model architecture

`backend/app/scientific.py` owns the scientific routes and application service; `literature.py` owns the canonical evidence index. The existing SQLite repository remains the separate demo explorer. No database migration or reseeding is required.

At application startup, `ScientificService` initializes one `model.predict.CapacityPredictor` per process. Initialization validates model identity, the embedded metadata/support profile against their checked-in JSON files, and the processed training CSV fingerprint. The serialized preprocessing pipeline and fitted CatBoost estimator remain unchanged.

`CapacityPredictor.predict_many()` validates each row using Phase 4B's existing `validate_support`, sends only supported rows through the serialized pipeline in one batch, and builds results with the existing rounding and interval rules. Single-row inference and the standalone CLI reuse the same implementation. A process-local lock bounds simultaneous native inference. There is no training in application startup or request handling.

Literature and model readiness are tracked separately. If the literature index is unavailable, the run endpoint fails with a retryable error rather than bypassing evidence precedence. If only the model is unavailable, exact literature remains accessible; configurations requiring inference return a service error. Malformed requests return 422; supported-domain failures return a numerical-result-free `unavailable` response. Runtime errors return safe messages and are logged on the server.

### Routes

| Endpoint | Purpose |
| --- | --- |
| `GET /api/digital-twin/options` | Backend-owned defaults, support ranges/vocabularies, model metadata, grid limits |
| `GET /api/literature/measurements` | Canonical core capacity observations and provenance |
| `POST /api/digital-twin/run` | Literature / predicted / unavailable result union |
| `POST /api/digital-twin/landscape` | One validated, batched response grid |
| `GET /api/scientific/readiness` | Independent model/literature readiness |
| `GET /api/health` | Existing API/SQLite connectivity contract, preserved |

The scientific input contract is separate from the historical demo `Inputs` schema. Requests use `{ "inputs": { ... } }`; raw inference features include measurement mode, temperature, duration in seconds, loading, family, components, elements, support, and pressure context. Derived features remain inside model preprocessing. The material scope is MgH2.

## Support enforcement and uncertainty

Ranges, missing policies, and vocabularies come from the checked-in support profile. The frontend displays them as guidance, not universal laboratory limits. It permits well-formed out-of-support input so the backend can still return exact literature before considering model eligibility.

The Phase 4B support rules are unchanged: pressure and element identity participate in validation even though they are not direct fitted features. Entirely unseen elements or families fail support; partly unseen elements and unseen support/preparation labels generate warnings. Missing pressure is allowed with a warning in both modes; missing loading is allowed only for desorption. Zero remains distinct from missing. Relational literature pressure is preserved, while the V1 validator uses the numeric pressure field as originally implemented.

Predictions retain the signed-residual empirical 90% interval from Phase 4B. Observed paper-held-out coverage was 86.2%, with mean width 5.0876 wt.% H2. The interval is not a confidence score, formal coverage guarantee, or certified laboratory uncertainty. The application does not recalculate, tighten, or replace it.

## Landscape meaning and implementation

The landscape shows **temperature (°C) × catalyst loading (wt.%) → predicted capacity (wt.% H2)** with other inputs fixed. Default extents come from the selected measurement mode's support profile. A request constructs a 20 × 20 grid; the endpoint accepts 2–40 points per axis, at most 1,600 cells, and only the two supported axis variables. Optional finite, increasing extents are bounded to 0–10,000 as a request guard; scientific support validation still decides whether each node may be predicted.

The server returns X/Y coordinates, capacity and interval matrices, support masks, reasons/warnings, model identity, and the original configuration. It includes a separate prediction at the actual selected coordinates in the same batch. That point is never estimated from a nearby grid node. Unsupported nodes have null capacity and null interval. An unsupported selected point has no invented plotted height; an unspecified loading has no Y coordinate.

The browser lazily loads Plotly's GL3D bundle after grid generation. It renders a restrained teal surface with gaps unconnected, a selected-prediction diamond, explicit units, hover details, and reset-view control. An accessible table retains all grid nodes, intervals, and masked-cell reasons. Theme colors and responsive dimensions adapt to the existing dashboard; compact screens use a full external X/Y/Z axis key to avoid clipped 3D titles. No automatic rotation or decorative animation is used.

Connecting sampled model predictions is a visual aid. The surface is not a molecular simulation, physical simulation, causal experiment, or experimentally verified continuous surface. The model is a tree estimator; the visualization does not imply a physically smooth response between sampled nodes.

The current support rules use independent mode-specific ranges and chemistry checks. They do not define a joint experimental coverage envelope. Consequently a default grid may be entirely supported or entirely unsupported; custom extents crossing a boundary produce partially masked grids. No artificial holes or new support algorithm were introduced.

## Frontend behavior

The scientific form and landscape precede a clearly labeled historical synthetic/demo explorer. Demo observations no longer load into the scientific Twin. Their existing filtering, comparisons, provenance, and condition-aware charts remain available with explicit synthetic labeling.

Literature, AI, and unavailable states have separate result presentations. Inputs are echoed with each result. Editing inputs marks older results and landscapes stale; requests use abort controllers so cancelled responses cannot replace current state. Landscape generation uses one explicit request, not requests per cell. API and graphics-context errors have retry controls. A failed graphics-module download leaves results and the grid table available, with an explicit page-reload recovery action because browsers cache failed module imports; that action resets unsaved inputs. Only theme preference is persisted locally.

## Local and container execution

Use Python 3.10 and the inference pins in `model/requirements-inference.txt`; `backend/requirements.txt` includes them. Start from the repository root with `python -m uvicorn app.main:app --app-dir backend --reload`. The model package is imported directly from the repository; no artifact is duplicated.

The backend Docker build context is the repository root and the image uses Python 3.10. It copies model runtime code, the one artifact and metadata, and required scientific CSVs under `/opt/h2-triad`. The SQLite volume remains `/app/data`; it cannot hide or overwrite the immutable scientific tables. The Docker build excludes local environments, generated browser output, and the literature PDF corpus. Compose readiness includes both scientific initialization and SQLite connectivity.

The frontend container continues to use the existing Vite workflow. Hosting, production static serving, and deployment are not part of this phase.

## Validation

Final validation completed on 2026-09-15:

| Check | Result |
| --- | --- |
| `python -m pytest model/tests -q` | **22 passed** |
| `python -m pytest backend -q` | **72 passed** |
| Standalone inference smoke checks | Supported prediction and interval, unsupported input, and malformed input passed |
| `npm run lint` | Passed |
| `npm run format:check` | Passed |
| `npm run build` | Passed; Plotly remains a separate lazy chunk |
| Full local Playwright suite | **26 passed** (51.7 seconds) |
| Full Playwright suite against Compose | **26 passed** (36.8 seconds) |
| `docker compose config --quiet` | Passed |
| Integrated Docker build and startup | Passed; backend healthy, frontend running |
| Direct backend and frontend-proxied scientific requests | Literature, prediction, unavailable, and 20 × 20 landscape passed on both paths |
| Git whitespace and active-page wording review | Passed; obsolete Phase 3 Twin wording removed |

Backend/model coverage includes every canonical literature observation, evidence precedence without invoking inference, qualified and room-temperature measurements, missingness, supported predictions and intervals, warning propagation, malformed requests, artifact initialization failures, cached initialization, batch parity, inference exceptions, masked cells, and grid limits. Synthetic records remain excluded even when scientific and demo data coexist.

Browser coverage includes literature/AI/unavailable presentations, stale responses, API error/retry behavior, malformed response contracts, literature loader recovery, lazy graphics loading, graphics download and context failures, supported/partly masked/all-masked landscapes, keyboard navigation, and reduced motion. Automated axe checks reported zero violations for the tested WCAG 2 A/AA and 2.1 AA rules in both themes. These automated checks do not constitute a complete manual accessibility certification.

The form and landscape were visually inspected at representative desktop (1,440 px), tablet (768 px), and mobile (390 and 320 px) widths in light and dark themes. Browser regression checks also cover 1,280 and 1,024 px dashboard widths. The final review verified matching plot/page theme colors, readable compact axis keys, visible selected-point information, and no horizontal page overflow. Screenshots and test state are retained locally in ignored `frontend/test-results/final-local/` and `frontend/test-results/compose/`. Testing used desktop Chrome with viewport and reduced-motion emulation; physical devices and other browser engines were not tested.

Both `http://localhost:8000/api` and the frontend proxy at `http://localhost:5173/api` returned 119 literature observations. Observation `M-0082` retained **> 4.21 wt.% H2**. The default custom configuration returned **3.6083 wt.% H2**, with empirical interval **[1.1628, 6.6989]**. Changing temperature to 999 °C returned `unavailable` with a null prediction. The default landscape returned 400 supported cells. These are integration fixtures, not new scientific validation results.

Local Python was 3.10.11; the Python 3.10 container resolved to 3.10.21. The unchanged pinned inference stack loaded and predicted successfully in both environments. Existing upstream deprecation warnings remain: the backend suite reported 45 warnings and the model suite 16, involving Starlette/AnyIO and scikit-learn/CatBoost compatibility. The production build warns about the lazy GL3D chunk size (approximately 1.69 MB, 537 kB gzip); it is loaded only when a supported landscape is displayed. None of these warnings caused a failed check.

The fitted artifact, `model/src/` implementation, and canonical/processed Phase 4 dataset were not modified. No training, commit, push, or deployment was performed.

## Changed-file inventory

- Documentation: `README.md`, `model/README.md`, and this document.
- Model integration/tests: `model/predict.py`, `model/tests/test_batch_inference.py`.
- Backend: `backend/app/main.py`, `domain.py`, `schemas.py`; new `literature.py`, `scientific.py`, and `scientific_schemas.py`; `backend/requirements.txt`, `pytest.ini`, `tests/test_domain.py`, and new `tests/test_scientific.py`.
- Runtime: `.dockerignore`, `backend/Dockerfile`, `docker-compose.yml`.
- Frontend shell/configuration: `frontend/index.html`, `package.json`, `package-lock.json`, `playwright.config.js`, `src/App.jsx`, `src/index.css`, and `src/hooks/useTheme.js`.
- Frontend components: `DigitalTwin.jsx`, `ExperimentTable.jsx`, `Header.jsx`; new `PlotSurface.jsx`, `PredictionLandscape.jsx`, and `SurfaceView.jsx`.
- Frontend data contracts/presentation: `src/data/dashboardService.js`; new `scientificService.js` and `scientificPresentation.js`.
- Browser tests: `frontend/tests/contracts.spec.js`, `dashboard.spec.js`, `start-backend.py`, and new `scientific.spec.js`.
- Existing working-tree formatting/line-ending changes with no substantive Git content diff: `Analysis.jsx`, `ExperimentDetails.jsx`, `Overview.jsx`, and `src/data/analysis.js`.

## Scientific limitations and Phase 6 boundary

The trained model still uses 109 observations from 16 papers, has broad uncertainty, and has no independent laboratory validation. Exact evidence means an exact match to the recorded sample and conditions, not complete knowledge of every physical variable. Custom configurations without verified sample identity cannot establish exact literature equivalence from model features alone. Generalization to unfamiliar chemistry remains limited even when the support validator permits a warning-bearing result.

Remaining Phase 6 work includes release/licensing decisions, reproducibility and security audit, production serving and hosting, deployment, and submission packaging. None is implemented here. Activation-energy prediction remains deferred.
