from fastapi.testclient import TestClient

from app.main import app


def test_health_check_confirms_api_and_sqlite(monkeypatch, tmp_path):
    database_path = tmp_path / "health-check.db"
    monkeypatch.setenv("DATABASE_PATH", str(database_path))

    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "api": "connected",
        "database": "connected",
    }
    assert database_path.is_file()


def test_health_check_reports_an_unavailable_database(monkeypatch, tmp_path):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path))

    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 503
    assert response.json() == {
        "status": "error",
        "api": "connected",
        "database": "disconnected",
    }
