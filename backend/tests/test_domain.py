import json
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.database import initialize_database
from app.main import create_app


def default_inputs(client):
    return client.get("/api/domain/options").json()["default_inputs"]


def test_list_detail_and_migration_values(client):
    response = client.get("/api/experiments")
    assert response.status_code == 200
    records = response.json()["items"]
    seed = json.loads(
        (Path(__file__).parents[1] / "app/seed_data.json").read_text(encoding="utf-8")
    )
    assert records == seed
    assert [r["hydrogen_capacity_wt_pct"] for r in records] == [
        4.8,
        5.5,
        6.1,
        5.2,
        5.9,
        6.4,
        4.4,
        5.1,
        5.8,
        3.2,
        6.3,
        3.8,
    ]
    for record in records:
        assert record["source"]["is_demo"] is True
        assert record["source"]["reference"] == "Phase 2 / " + record["id"]
        assert client.get("/api/experiments/" + record["id"]).json() == record
        result = client.post("/api/digital-twin/run", json={"inputs": record["inputs"]})
        assert result.status_code == 200
        assert result.json()["items"] == [record]
        assert result.json()["status"] == "matched"


def test_missing_and_malformed_ids(client):
    assert client.get("/api/experiments/EXP-999").status_code == 404
    assert client.get("/api/experiments/bad%20id").status_code == 422
    assert client.get("/api/experiments/" + "x" * 65).status_code == 422


def test_options_are_database_owned(client):
    response = client.get("/api/domain/options")
    assert response.status_code == 200
    options = response.json()
    records = client.get("/api/experiments").json()["items"]
    assert options["materials"] == sorted({r["inputs"]["material"] for r in records})
    assert {o["value"] for o in options["additives"]} == {
        r["inputs"]["additive"] for r in records
    }
    assert options["default_inputs"] == records[2]["inputs"]
    assert options["numeric_constraints"]["pressure_bar"] == {
        "min": 0.1,
        "max": 100,
        "step": 0.1,
    }


def test_unsupported_is_exact_and_has_no_outputs(client):
    inputs = default_inputs(client)
    inputs["temperature_c"] += 0.000001
    response = client.post("/api/digital-twin/run", json={"inputs": inputs})
    assert response.status_code == 200
    assert response.json() == {
        "status": "unavailable",
        "reason": "no_exact_match",
        "inputs": inputs,
        "items": [],
    }


@pytest.mark.parametrize(
    "field,value",
    [
        ("temperature_c", 501),
        ("temperature_c", 19),
        ("pressure_bar", 0),
        ("pressure_bar", 101),
        ("particle_size_nm", 0),
        ("particle_size_nm", 1001),
        ("concentration_wt_pct", -1),
        ("concentration_wt_pct", 31),
        ("milling_hours", -1),
        ("milling_hours", 49),
        ("temperature_c", "300"),
        ("temperature_c", True),
        ("temperature_c", None),
        ("material", "invented"),
        ("additive", "invented"),
        ("preparation_method", "invented"),
        ("material", 123),
        ("additive", "None"),
        ("preparation_method", "Solution mixing"),
    ],
)
def test_invalid_configuration(client, field, value):
    inputs = default_inputs(client)
    inputs[field] = value
    assert (
        client.post("/api/digital-twin/run", json={"inputs": inputs}).status_code == 422
    )


def test_invalid_body(client):
    for body in ({}, {"inputs": {}}, {"inputs": default_inputs(client), "extra": 1}):
        assert client.post("/api/digital-twin/run", json=body).status_code == 422
    inputs = default_inputs(client)
    inputs["extra"] = 1
    assert (
        client.post("/api/digital-twin/run", json={"inputs": inputs}).status_code == 422
    )
    for body in ('{"inputs":', '{"inputs":{"temperature_c":NaN}}'):
        response = client.post(
            "/api/digital-twin/run",
            content=body,
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422
        assert "input" not in response.json()["detail"][0]


def test_database_changes_and_duplicates_are_not_overwritten(client, database_path):
    original = client.get("/api/experiments/EXP-003").json()
    # Change only the isolated test database to prove there is no runtime fixture fallback.
    with sqlite3.connect(database_path) as db:
        db.execute(
            "UPDATE experiments SET source_label = 'Persistence test' WHERE id = 'EXP-003'"
        )
        columns = [row[1] for row in db.execute("PRAGMA table_info(experiments)")]
        select = ["'REPEAT-003'" if name == "id" else name for name in columns]
        db.execute(
            "INSERT INTO experiments SELECT "
            + ",".join(select)
            + " FROM experiments WHERE id = 'EXP-003'"
        )
        db.execute(
            "UPDATE experiments SET measurement_duration_minutes = 30 WHERE id = 'REPEAT-003'"
        )
    with TestClient(create_app(database_path)) as restarted:
        assert (
            restarted.get("/api/experiments/EXP-003").json()["source"]["label"]
            == "Persistence test"
        )
        result = restarted.post(
            "/api/digital-twin/run", json={"inputs": original["inputs"]}
        ).json()
        assert [r["id"] for r in result["items"]] == ["EXP-003", "REPEAT-003"]
        assert [r["measurement"]["duration_minutes"] for r in result["items"]] == [
            20,
            30,
        ]


def test_initialization_empty_phase_one_and_no_reseeding(database_path):
    with sqlite3.connect(database_path) as db:
        db.execute("SELECT 1")
    initialize_database(database_path)
    initialize_database(database_path)
    with sqlite3.connect(database_path) as db:
        assert db.execute("SELECT count(*) FROM experiments").fetchone()[0] == 12
        assert db.execute("PRAGMA user_version").fetchone()[0] == 1
        db.execute("DELETE FROM experiments")
    with TestClient(create_app(database_path)) as restarted:
        assert restarted.get("/api/experiments").json() == {"items": []}
        assert restarted.get("/api/domain/options").json()["default_inputs"] is None


def test_seed_disabled_is_persistent(database_path):
    with TestClient(create_app(database_path, seed_demo=False)) as client:
        assert client.get("/api/experiments").json() == {"items": []}
    with TestClient(create_app(database_path, seed_demo=True)) as client:
        assert client.get("/api/experiments").json() == {"items": []}


def test_database_errors_are_safe(client, database_path, tmp_path):
    with sqlite3.connect(database_path) as db:
        db.execute("DROP TABLE experiments")
    response = client.get("/api/experiments")
    assert response.status_code == 503
    assert "no such table" not in response.text
    with TestClient(create_app(tmp_path)) as unavailable:
        assert unavailable.get("/api/health").status_code == 503
        assert unavailable.get("/api/experiments").status_code == 503


def test_unknown_schema_is_not_modified(database_path):
    with sqlite3.connect(database_path) as db:
        db.execute("PRAGMA user_version = 99")
    with TestClient(create_app(database_path)) as client:
        assert client.get("/api/experiments").status_code == 503
    with sqlite3.connect(database_path) as db:
        assert db.execute("PRAGMA user_version").fetchone()[0] == 99
