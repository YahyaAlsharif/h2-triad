# Phase 3: persistent domain backend

## Goal and delivered architecture

Phase 3 replaces the frontend-owned mock dashboard with React → HTTP → FastAPI → SQLite. The working branch started at Phase 2 commit `34fda1f`, with a clean working tree. Phase 1 is its parent `593b0af`.

The backend is the source of truth. It owns records, selectable options, input bounds/applicability, defaults, request validation, and database access. The frontend derives display groups, counts, filtering, sorting, and comparisons from returned records.

The implementation uses the standard-library SQLite driver, Pydantic models, one domain router, and a small repository module. There is no ORM, migration framework, authentication, saved-run system, or additional state framework.

## Database schema

SQLite schema version 1 contains one `experiments` table:

| Column | Storage / meaning |
| --- | --- |
| `id` | Required text primary key; API accepts 1–64 URL-safe letters/digits/underscores/hyphens, beginning with a letter or digit |
| `material` | Required base-material label |
| `additive` | Required additive/catalyst label, including the existing “None” option |
| `concentration_wt_pct` | Additive loading, wt%; 0–30 |
| `preparation_method` | Required preparation label |
| `milling_hours` | Ball milling duration, h; 0–48 |
| `particle_size_nm` | Particle size, nm; 1–1000 |
| `temperature_c` | Experimental temperature, °C; 20–500 |
| `pressure_bar` | Hydrogen pressure, bar; 0.1–100 |
| `hydrogen_capacity_wt_pct` | Stored capacity, wt%; 0–100 |
| `outcome` | Stored Promising / Moderate / Limited category |
| `measurement_mode` | Measurement type/mode |
| `measurement_duration_minutes` | Measurement duration, min; nonnegative |
| `capacity_basis` | Denominator, such as total composite mass |
| `source_kind` | Source classification |
| `source_label` | Source title/label |
| `source_reference` | Explicit source reference |
| `is_demo` | Required SQLite boolean, 0 or 1 |

Numbers are SQLite REAL values; identifiers and labels are text. Required values, numeric bounds, outcomes, and boolean storage have database constraints. API responses group flat storage into `inputs`, `measurement`, and `source`.

No uniqueness constraint is imposed on configuration fields: distinct experiments can share inputs. Queries use bound SQL parameters. Connections are closed after use.

## Initialization and persistence

Startup opens a transaction with `BEGIN IMMEDIATE`, checks `PRAGMA user_version`, creates version 1 from the empty Phase 1 schema, and optionally seeds it. The transaction commits only after initialization succeeds. Concurrent initializers cannot insert the seed twice.

Version 1 also records the completed one-time seed decision. An empty version-1 database stays empty on restart; deleted rows are not recreated, and changed rows are not overwritten. Unsupported schema versions fail safely without being rewritten.

`SEED_DEMO_DATA` defaults to `true`; `false` skips seeds for a new database. Updating the seed file does not update an existing database. This deliberately leaves future research-data replacement as an explicit operation rather than an implicit destructive startup behavior.

Local paths retain Phase 1 semantics. Compose retains the existing `backend_data:/app/data` volume. Runtime SQLite files remain ignored. No domain state is stored in localStorage; unsaved inputs, selected comparisons, and chart controls are transient UI state. Theme preference remains local.

Initialization failures leave the API available to report the existing health contract. Domain endpoints return a safe 503 until the initialization problem is fixed and the application is restarted. Health tests SQLite connectivity only; it does not assert domain-schema readiness.

## API contracts

### Health

`GET /api/health` preserves:

```json
{ "status": "ok", "api": "connected", "database": "connected" }
```

An unavailable database returns HTTP 503 with:

```json
{ "status": "error", "api": "connected", "database": "disconnected" }
```

### Experiments

`GET /api/experiments` returns HTTP 200 with `{ "items": [Experiment, ...] }`, ordered by ID. An empty database returns `{ "items": [] }`.

`GET /api/experiments/{id}` returns one Experiment, HTTP 404 for an absent well-formed ID, or 422 for an invalid ID.

Each Experiment includes:

- `id`
- `inputs`: material, additive, concentration_wt_pct, preparation_method, milling_hours, particle_size_nm, temperature_c, pressure_bar
- `hydrogen_capacity_wt_pct` and stored `outcome`
- `measurement`: mode, duration_minutes, capacity_basis
- `source`: kind, label, reference, is_demo

### Options

`GET /api/domain/options` returns:

- `materials`: distinct stored material labels
- `additives`: distinct values with `allows_loading` metadata
- `methods`: distinct values with `allows_milling` metadata
- `numeric_constraints`: min/max/step for the five numeric inputs; bounds derive from the backend input schema
- `default_inputs`: inputs read from EXP-003 when present, otherwise the first stored experiment; null for an empty database

The applicability flags preserve the Phase 2 form conventions. Additive-free configurations use zero loading; the existing solution-mixing option uses zero ball milling time. These are application conventions, not a generalized chemistry ontology.

### Digital Twin

`POST /api/digital-twin/run` accepts:

```json
{
  "inputs": {
    "material": "MgH₂",
    "additive": "Ni",
    "concentration_wt_pct": 5,
    "preparation_method": "Ball milling",
    "milling_hours": 4,
    "particle_size_nm": 100,
    "temperature_c": 300,
    "pressure_bar": 10
  }
}
```

When all eight inputs match, HTTP 200 returns:

```text
{
  status: "matched",
  match_method: "exact",
  inputs: submitted configuration,
  items: [all matching stored Experiment records]
}
```

The example returns EXP-003 with its stored 6.1 wt% capacity. Matching uses exact database equality, with no rounding tolerance, nearest match, interpolation, extrapolation, or model.

When there is no match, HTTP 200 returns:

```text
{
  status: "unavailable",
  reason: "no_exact_match",
  inputs: submitted configuration,
  items: []
}
```

There are no numerical output fields in an unavailable response. Numeric submitted inputs remain visible as configuration context.

Multiple records with identical configuration inputs are returned separately. Their measurement mode, duration, basis, and provenance may differ; the Twin neither chooses one silently nor averages them.

### Validation and errors

Pydantic validates required fields, strict numeric input types, finite values, bounds, and unexpected fields. Available categorical values and form applicability are checked on the backend. Numeric strings, booleans, nulls, unknown categorical values, malformed JSON, and invalid IDs are rejected.

The API uses 422 for invalid requests, 404 for missing records, 503 for unavailable database operations, and safe 500 responses for internal/stored-data errors. Validation errors omit raw submitted bodies and exception contexts. Internal Python/SQLite errors are logged server-side and are not returned to the browser.

Browser-native min/max/step checks improve form interaction; the API accepts finite values within bounds without imposing UI step increments.

## Seed/demo-data policy and migration

`backend/app/seed_data.json` is the sole canonical seed dataset. All twelve Phase 2 experiment records preserve their exact original inputs, capacities, outcomes, measurement metadata, source labels, and “Phase 2 / EXP-…” references. Their source kind is now explicitly `synthetic_demo`, with `is_demo: true`.

Migration was compared directly against the original JavaScript experiment array before that file was deleted.

The four separate prediction fixtures disagreed with experiment values at the same configurations:

| Additive at the previous default conditions | Canonical stored capacity | Retired prediction fixture |
| --- | --- | --- |
| Ni | 6.1 wt% | 6.2 wt% |
| Fe–Ni / N-C | 6.4 wt% | 6.5 wt% |
| TiF₃ | 5.8 wt% | 5.7 wt% |
| None | 3.2 wt% | 3.4 wt% |

Those prediction fixtures were retired, not relabeled as measurements. Synthetic confidence scores and desorption outputs were removed because they had no defensible stored measurement meaning. All twelve dataset configurations now support lookup.

**These records are synthetic/demo records, not literature-derived truth or laboratory evidence. No real research records have been added.**

## Frontend migration and scientific presentation

`dashboardService.js` performs abortable fetches with a timeout and validates response shapes before returning data to components. It checks nested metadata, finite numeric values, unique IDs, option/default consistency, exact-match input consistency, and unavailable-result semantics. Malformed JSON or records produce controlled errors. There is no fallback mock array or artificial network delay.

Dataset and options load independently with retry/error/empty states. The Twin preserves reset, loading, stale-result indication, error/retry, and unsupported states. A dataset record can be loaded and looked up with the same stored result. Comparison starts empty and allows three selections.

Overview statistics derive from returned records. A highest-capacity summary includes conditions, measurement basis, and provenance, and is suppressed when measurement modes, durations, or bases differ. It is not a universal material ranking. Outcome labels remain stored categories.

Chart cohorts match base material, loading, hydrogen pressure, preparation method, milling hours, particle size, measurement mode, measurement duration, and capacity basis. Temperature varies along the axis and additive identifies a series.

**Source/provenance identity is not a grouping key.** Different sources remain together when the specified scientific and measurement conditions match. Every observation retains provenance in its tooltip and accessible table. Duplicate observations are retained individually, including overlapping points. No averaging, fitted line, or interpolation occurs. Single-temperature groups explicitly say so.

Comparison details name differing material/loading/preparation/test/measurement conditions. The chart’s accessible table includes each observation ID, additive, temperature, capacity, and source; its caption carries the shared measurement and preparation conditions.

The teal light/dark visual direction, native controls, keyboard focus, status announcements, reduced motion, responsive dataset rows, and chart data equivalent remain.

## Tests and validation

Backend tests use isolated temporary SQLite files. Browser tests launch a temporary-database backend on 8001 and a separate Vite proxy on 5174. The developer database is not used by the local test suite. Compose integration tests exercise the existing demo application without changing its records.

Fault injection occurs only in tests through HTTP interception. Loading tests hold/release requests explicitly instead of relying on simulated delays. Contract tests build malformed or duplicate test observations from backend-returned records, rather than duplicating the domain dataset in frontend fixtures.

Validation performed on 12 September 2026:

| Check | Result |
| --- | --- |
| Backend pytest | 31 passed |
| Frontend lint | Passed |
| Frontend format check | Passed |
| Frontend production build | Passed |
| Local frontend tests | 17 passed |
| Compose frontend tests | 17 passed |
| Compose configuration and build/start | Passed |
| Direct and Vite-proxied domain/health calls | Passed; twelve records and default 6.1 wt% result |
| Restart persistence | All twelve complete records unchanged after backend stop/start; volume inspected at schema version 1 |
| Responsive checks | No page-level overflow at 1440, 1280, 1024, 768, 390, and 320 px in both themes |
| Accessibility | Axe passes in tested desktop themes and expanded mobile state; keyboard and reduced-motion checks pass |
| Visual inspection | Desktop, tablet, and mobile screenshots inspected in light/dark themes |
| Actual backend outage/recovery | Lookup, dataset, options, and health states handled the stopped backend; retries recovered after restart; unsupported inputs produced no numerical results |

The backend suite retains an existing Starlette/AnyIO deprecation warning. Browser tooling emits its existing color-environment warning. Neither prevents validation.

Screenshot/trace artifacts remain ignored under `frontend/test-results/`, with Compose artifacts under `frontend/test-results/compose/`.

## Known limitations

- The application is a small read-only demo dataset explorer with exact configuration lookup.
- No trained model, calibrated uncertainty, scientific prediction engine, or real experimental evidence is included.
- Input bounds and categorical applicability conventions cover the current prototype; broader research data may require deliberate schema/validation updates.
- Exact equality intentionally rejects nearby numerical configurations.
- Known metadata compatibility cannot establish that experiments from different studies are scientifically equivalent in every unrecorded respect.
- Overlapping observations may share a plotted position; the accessible table retains each record and source.
- There is no editing, upload, export, saved-run history, pagination, or ingestion pipeline.
- Theme is persisted locally; unsaved configuration and comparison selections reset on refresh.
- Browser verification uses Chrome with emulated viewport widths; it is not a full screen-reader, physical-device, or cross-browser audit.
- Compose continues to serve the frontend with Vite’s development server, as in Phase 1.

## Phase 4 handoff

The stable record structure and provenance fields provide a boundary for later research data. Replace demo records explicitly while preserving units, measurement duration/mode, capacity denominator, source references, and synthetic flags. Do not silently mix demo records into model training or represent their outcomes as evidence.

Phase 4 owns model development and scientific evaluation after appropriate data exists. Phase 5 owns model integration. Neither training nor inference is implemented in Phase 3, and the exact-lookup result must remain distinguishable from any future model result.
