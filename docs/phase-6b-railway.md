# Phase 6B: Railway production deployment

## Architecture

Railway runs one Web Service from the repository-root `Dockerfile`. A Node 24
build stage runs `npm ci` and compiles the Vite/React frontend. The final Python
3.10 slim stage contains only the FastAPI application, model inference code,
frozen model artifacts, required scientific CSV files, and compiled frontend.
One Uvicorn process serves both surfaces:

- `/` and frontend routes: compiled React single-page application
- `/assets/*`: compiled frontend assets
- `/api/*`: FastAPI only, including JSON 404 responses for unknown API paths

The frontend already uses relative `/api/...` requests. Local Vite development
continues to proxy those requests to the backend and needs no CORS configuration.
The `ScientificService` lifespan initialization loads and validates the frozen
CatBoost bundle once per process. Landscape prediction remains one batched model
call.

## Railway settings

- Source: `YahyaAlsharif/h2-triad`
- Branch: `main`
- Service type: one Web Service
- Builder: Dockerfile (repository-root `Dockerfile`)
- Start command: leave unset; use the image `CMD`
- Health-check path: `/api/health`
- Public networking: generate one Railway domain after a healthy deployment
- Database and volume: none

Railway [injects `PORT`](https://docs.railway.com/deployments/healthchecks). The
image binds Uvicorn to `0.0.0.0:${PORT}` and falls
back to port 8000 outside Railway. No user-supplied environment variable or
secret is required. `DATABASE_PATH` defaults in the image to
`/tmp/h2-triad/app.db`, and `SEED_DEMO_DATA=true` safely creates the historical
synthetic/demo records on a fresh container. This database is ephemeral. The
scientific evidence and model do not depend on writable persistent storage.

`/api/health` performs only the existing lightweight API/SQLite connectivity
check. `/api/scientific/readiness` independently reports that literature and the
model loaded successfully; neither endpoint runs a landscape prediction.

## Local production validation

```sh
docker build -t h2-triad:phase6b .
docker run --rm -e PORT=8080 -p 8080:8080 h2-triad:phase6b
```

Open `http://localhost:8080`. Check `/api/health` and
`/api/scientific/readiness` on the same origin. The targeted release HTTP smoke
checks can be pointed at `http://localhost:8080/api`; Playwright can use
`PLAYWRIGHT_BASE_URL=http://localhost:8080` to exercise the production container.

## Trial and Free limitations

Railway usage is credit-limited. At the time of this preparation, the
[trial is up to 30 days or a one-time $5 grant](https://docs.railway.com/pricing/free-trial),
then the Free plan provides $1 monthly credit. Trial workloads are limited to
1 GB RAM and shared CPU; an unverified Limited Trial also restricts outbound
networking. H2-Triad does not require outbound runtime access. If
[Railway Serverless sleep](https://docs.railway.com/overview/advanced-concepts)
is enabled, the first request after idling may wait for startup; the frontend
renders immediately and uses three bounded `/api/health` attempts to expose a
restrained readiness state.

The largest frontend chunk is the lazily loaded 3D Plotly surface, so its first
display requires a larger asset download. The production image uses one worker
to avoid duplicating the in-memory model. SQLite changes do not survive a
restart, by design for the demo explorer.

External deployment is intentionally pending manual GitHub connection and
Railway domain creation. This preparation creates no Railway resource.
