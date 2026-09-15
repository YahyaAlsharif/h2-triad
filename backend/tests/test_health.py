from fastapi.testclient import TestClient

from app.main import app, create_app


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


def test_production_frontend_serves_spa_without_swallowing_api_404(tmp_path):
    frontend = tmp_path / "dist"
    assets = frontend / "assets"
    assets.mkdir(parents=True)
    (frontend / "index.html").write_text("<main>production app</main>")
    (assets / "app.js").write_text("console.log('production')")

    with TestClient(create_app(tmp_path / "app.db", static_dir=frontend)) as client:
        assert client.get("/").text == "<main>production app</main>"
        assert client.get("/workspace/deep-link").text == "<main>production app</main>"
        assert client.get("/assets/app.js").text == "console.log('production')"
        missing = client.get("/api/does-not-exist")

    assert missing.status_code == 404
    assert missing.json() == {"detail": "Not Found"}


def test_missing_production_frontend_keeps_api_only_mode(tmp_path):
    with TestClient(
        create_app(tmp_path / "app.db", static_dir=tmp_path / "missing")
    ) as client:
        assert client.get("/").status_code == 404
