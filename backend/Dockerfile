FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
COPY model/requirements-inference.txt ./model/requirements-inference.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

WORKDIR /opt/h2-triad
COPY backend/app ./backend/app
COPY model/__init__.py model/predict.py ./model/
COPY model/src ./model/src
COPY model/artifacts ./model/artifacts
COPY data/phase4_dataset/*.csv ./data/phase4_dataset/
COPY data/phase4_dataset/processed/capacity_training.csv ./data/phase4_dataset/processed/
RUN mkdir -p /app/data

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
