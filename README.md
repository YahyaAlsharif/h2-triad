# H2-TRIAD

Phase 1 technical foundation for an AI-assisted hydrogen/materials digital twin. This scaffold proves that a React frontend, FastAPI backend, and SQLite database can work together. It intentionally contains no dashboard, domain, or AI functionality yet.

## Stack

- React 19, Vite, JavaScript, and Tailwind CSS
- Python, FastAPI, and Uvicorn
- SQLite
- Docker and Docker Compose

## Structure

```text
.
├── frontend/          # Temporary React system-check page and Vite proxy
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

Validate the Compose file and build both images:

```bash
docker compose config --quiet
docker compose build
```
