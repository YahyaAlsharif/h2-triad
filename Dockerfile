FROM node:24-alpine AS frontend-build

WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM python:3.10-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATABASE_PATH=/tmp/h2-triad/app.db \
    SEED_DEMO_DATA=true

WORKDIR /opt/h2-triad

COPY backend/requirements-production.txt ./backend/requirements-production.txt
COPY model/requirements-inference.txt ./model/requirements-inference.txt
RUN pip install --no-cache-dir -r backend/requirements-production.txt

COPY backend/app ./backend/app
COPY model/__init__.py model/predict.py ./model/
COPY model/src ./model/src
COPY model/artifacts ./model/artifacts
COPY data/phase4_dataset/*.csv ./data/phase4_dataset/
COPY data/phase4_dataset/processed/capacity_training.csv ./data/phase4_dataset/processed/
COPY --from=frontend-build /build/frontend/dist ./frontend/dist

RUN mkdir -p /tmp/h2-triad

EXPOSE 8000

CMD ["sh", "-c", "exec python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port \"${PORT:-8000}\" --workers 1"]
