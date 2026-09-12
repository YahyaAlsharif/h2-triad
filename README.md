# H2-TRIAD

Hydrogen materials digital-twin workspace. Phase 2 adds a responsive React dashboard with an interactive mock Digital Twin, condition-aware experiment comparison, Recharts visualization, and a searchable dataset. The Phase 1 FastAPI → SQLite health integration remains intact. Domain records and prediction results are synthetic fixtures; no domain backend or trained model exists yet.

## Stack

- React 19, Vite, JavaScript, and Tailwind CSS
- Python, FastAPI, and Uvicorn
- SQLite
- Docker and Docker Compose

## Structure

```text
.
├── frontend/          # React dashboard, isolated mock adapter, and Vite proxy
├── backend/
│   ├── app/           # FastAPI application and SQLite connectivity helper
│   ├── tests/         # API health test
│   ├── data/          # Runtime SQLite file (created automatically, ignored)
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

The browser calls only `/api/health`. Vite proxies that path to FastAPI, using `localhost:8000` locally and the Compose service name inside Docker.

Dashboard records, prediction fixtures, and chart cohort metadata live in `frontend/src/data/mockExperiments.js`. `dashboardService.js` exposes abortable asynchronous operations shaped for future API replacement. A prediction is returned only for an exact saved configuration; custom inputs without a fixture show an explicit unavailable state. Nothing is persisted except the theme preference.

See [Phase 2 delivery and QA](docs/phase-2-frontend.md) for architecture, mock contracts, browser coverage, limitations, and the Phase 3 handoff. The existing HTML prototype, research report, and `STYLE.md` are preserved as historical reference material; Phase 2 follows the requested light/teal visual direction.

## Prerequisites

- Node.js 24+ and npm
- Python 3.11+
- Docker Desktop with Docker Compose (for the container workflow)

## Local development

Start the backend:

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

In a second terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

No environment file is required for the defaults. In local development, a `DATABASE_PATH` shell variable can override the SQLite path; relative values resolve from `backend/`. `VITE_API_PROXY_TARGET` can override the Vite proxy target. On Windows systems that block PowerShell scripts, use `npm.cmd` in place of `npm`.

## Docker

From the repository root:

```bash
docker compose up --build
```

The optional root `.env` file is read by Compose; copy `.env.example` only if you need to override its defaults. Stop the services with `docker compose down`. SQLite data persists in the named `backend_data` volume. Use `docker compose down --volumes` only when you intentionally want to remove that Phase 1 database volume.

## URLs

- Frontend: <http://localhost:5173>
- Backend API docs: <http://localhost:8000/docs>
- Health endpoint: <http://localhost:8000/api/health>

The health endpoint returns `200` only after it opens SQLite and executes a connectivity query.

## Validation

Run the backend test:

```bash
cd backend
pytest
```

Build the frontend:

```bash
cd frontend
npm run build
```

Lint, format, and run the real-browser suite (with the backend running):

```bash
cd frontend
npm run lint
npm run format:check
npm test
```

The browser suite uses installed Google Chrome and starts a separate Vite instance on port 5174, so it can coexist with Compose on 5173. To use Playwright Chromium instead, run `npx playwright install chromium` and set `PLAYWRIGHT_CHANNEL=chromium`. Set `PLAYWRIGHT_BASE_URL=http://localhost:5173` to test the Compose frontend. On PowerShell, set environment variables with `$env:NAME='value'`. Browser screenshots and failure traces are written to the ignored `frontend/test-results/` directory. `npm run test:ui` opens Playwright's interactive runner.

Validate the Compose file and build both images:

```bash
docker compose config --quiet
docker compose build
```
