# Phase 2 frontend delivery

Phase 2 implements the hydrogen-materials dashboard using synthetic data. No domain endpoints, database schema, persistence, authentication, chemistry calculations, AI, or training code were added. No commit or push was performed.

## Experience

- A restrained light interface with teal accents, a shared dark theme, a single system font, and tabular numbers. Theme preference is stored locally and applied before React renders; light is the default.
- A compact overview calculated from the mock records. The highest capacity retains material, loading, temperature, pressure, milling, and particle size context; it is not presented as a universal best material.
- A Digital Twin form with eight configuration fields, native numeric validation, reset, loading, error/retry, unavailable-fixture, and stale-result states. Material/preparation and experimental conditions are grouped separately. Results retain the submitted configuration.
- A comparison of up to three experiments. Mismatched test and preparation conditions are explicitly named and highlighted in the detailed comparison table.
- A Recharts capacity-versus-temperature chart limited to a matched cohort. Series controls, distinct line patterns, tooltips, units, and a data-table equivalent support interpretation. Lines connect fixtures and do not represent a chemical model.
- A searchable, outcome-filterable, sortable experiment table. Expand records for measurement duration, capacity denominator, and synthetic source reference; load any record into the Digital Twin.
- A live FastAPI/SQLite connection indicator with a retry control. Backend failure does not disable the mock workspace.

## Frontend architecture

| File | Responsibility |
| --- | --- |
| `src/App.jsx` | Dataset loading, selected experiment IDs, configuration handoff, and section composition |
| `src/components/Header.jsx` | Branding, anchor navigation, health check, theme toggle |
| `src/components/Overview.jsx` | Small dataset summary derived from records |
| `src/components/DigitalTwin.jsx` | Inputs, async mock run, and result lifecycle |
| `src/components/Analysis.jsx` | Matched-cohort chart and selected experiment comparison; loaded in a separate bundle |
| `src/components/ExperimentTable.jsx` | Search, filter, sort, record details, and configuration handoff |
| `src/components/ExperimentDetails.jsx` | Shared material, conditions, and outcome rendering |
| `src/hooks/useTheme.js` | Theme state and storage |
| `src/data/mockExperiments.js` | All synthetic records, result values, defaults, options, and cohort metadata |
| `src/data/dashboardService.js` | Abortable data adapter and exact fixture lookup |
| `src/index.css` | Shared light/dark tokens, component styles, responsive rules, focus, reduced motion |

React remains JavaScript, Tailwind remains integrated through Vite, and component styles use shared CSS tokens. There are no new runtime image or font requests. ESLint, Prettier, Playwright, and axe are development dependencies.

## Mock contract

`getExperiments({ signal })` returns `{ items, chart_cohort, source: 'mock' }` with 12 records. Each record includes:

- `id`
- `inputs`: material, additive, concentration in wt%, preparation method, milling hours, particle size in nm, temperature in °C, pressure in bar
- `hydrogen_capacity_wt_pct` and a fixture-defined `outcome`
- `measurement`: absorption mode, duration in minutes, and total-composite-mass capacity basis
- `source`: explicit mock kind, label, and synthetic reference

`runDigitalTwin(inputs, { signal })` returns a saved result only when all eight inputs match exactly. Four complete fixtures cover Ni, Fe–Ni / N-C, TiF₃, and an additive-free configuration. All use the default MgH₂ preparation/test setup; the additive-free fixture uses zero loading. Capacity, desorption temperature, outcome, and confidence are copied from fixtures. Unsupported input combinations return `status: 'unavailable'`, with no numerical output. Delays are only interaction simulation, not computation.

Inputs are illustrative UI bounds, not laboratory operating limits or synthesis advice. Fixture confidence is a synthetic display value, not calibrated uncertainty. Synthetic references do not impersonate real papers.

## Responsive and accessibility QA

Real Chrome browser testing covers 1440, 1280, 1024, 768, 390, and 320 px widths in both themes. Desktop keeps inputs and results side by side. Tablet places results directly after the form while retaining paired fields. Mobile uses a compact two-row header and turns dataset rows into labeled records; the smallest width uses single-column inputs for readable values. The detailed comparison table scrolls inside its own keyboard-focusable region.

Verified keyboard focus, the skip link, labeled native controls, numeric validation, disabled dependent controls, live status announcements, non-color outcome text, chart line patterns/data equivalent, theme persistence, and reduced-motion behavior. Axe checks WCAG 2 A/AA and 2.1 AA rules in light/dark desktop and an expanded mobile record. These checks do not constitute a full screen-reader or accessibility conformance audit.

Visual inspection included full-page and viewport screenshots of desktop, laptop, tablet, and mobile layouts, plus loading and failure states. Refinements removed redundant copy, corrected chart ARIA labeling, improved the smallest header, made the mobile primary action full width, aligned mobile overview values, and reduced unnecessary field-label space. Both themes use identical structure. Screenshots are generated under `frontend/test-results/` and are intentionally ignored by Git and Docker.

## Validation

| Check | Result |
| --- | --- |
| `npm install` | Pass; dependency audit reports no vulnerabilities |
| `npm run lint` | Pass |
| `npm run format:check` | Pass |
| `npm run build` | Pass; chart split removes the initial large-bundle warning |
| `npm test` | 8 real Chrome browser tests pass locally; all 8 also pass against the final Docker Compose frontend |
| Browser accessibility scans | No axe violations in the tested states |
| Responsive overflow checks | No page-level horizontal overflow at the six tested widths, in both themes |
| Backend `python -m pytest` from `backend/` | 2 tests pass; existing dependency deprecation warning remains |
| Direct and proxied `/api/health` | HTTP 200; API and SQLite connected |
| `docker compose config --quiet` | Pass |
| `docker compose up --build -d` | Pass; backend healthy, frontend running |

The suite exercises every major control: form configuration/reset/run, filters and sorting, empty search results, record details and handoff, selection limits/removal, mismatched comparisons, chart controls/tooltips, theme toggle, health retry, dataset retry, and prediction recovery. Failure injection exists only in browser tests; the shipped adapter has no hidden failure switches.

The final Compose run's screenshots are in `frontend/test-results/compose/`. Examples: [light desktop](../frontend/test-results/compose/dashboard-responsive-scree-69c7f-rflow-checks-in-both-themes/light-1440-viewport.png), [mobile chart](../frontend/test-results/compose/dashboard-responsive-scree-69c7f-rflow-checks-in-both-themes/light-390-analysis.png), and [dark mobile dataset](../frontend/test-results/compose/dashboard-responsive-scree-69c7f-rflow-checks-in-both-themes/dark-390-experiments.png). These local artifacts are not committed and are regenerated by the test suite.

## Changed files

- Updated: `.gitignore`, `README.md`, `frontend/.dockerignore`, `frontend/index.html`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/App.jsx`, `frontend/src/index.css`.
- Formatting only: `frontend/src/main.jsx`, `frontend/vite.config.js`; proxy behavior is unchanged.
- Added: the six component files, theme hook, and two data files listed above; `frontend/eslint.config.js`, `frontend/playwright.config.js`, `frontend/.prettierrc.json`, `frontend/.prettierignore`, `frontend/tests/dashboard.spec.js`, and this report.
- Preserved: all backend source/tests, Compose service configuration, `.env.example`, HTML prototype, research report, and `STYLE.md`.

## Limitations and Phase 3 handoff

Only the four predefined configurations return a mock prediction. Dataset records and comparisons are in-memory and reset on refresh. There is no export, editing, upload, saving, pagination, or domain network integration. Browser verification uses desktop Chrome with emulated viewport widths, not physical mobile devices or Safari/Firefox. The existing Compose frontend remains a development server, as in Phase 1.

Phase 3 should replace the mock adapter with domain API data, implement the complete non-AI dashboard and persistence, and maintain explicit units, measurement methods, denominator, conditions, and source provenance. Validate real response shapes at the API boundary and adapt chart cohorts to actual experimental records. Remove synthetic records from the shipped application when the real endpoints are ready. AI/model development belongs to Phase 4 and AI integration to Phase 5.

Phase 2 is ready for review and commit. Nothing has been staged, committed, or pushed by this task.
