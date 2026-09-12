"""Transactional SQLite bootstrap; runtime requests always read SQLite."""

import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from app.schemas import Experiment

BACKEND_DIRECTORY = Path(__file__).resolve().parents[1]
DEFAULT_DATABASE_PATH = BACKEND_DIRECTORY / "data" / "app.db"
INPUT_COLUMNS = (
    "material",
    "additive",
    "concentration_wt_pct",
    "preparation_method",
    "milling_hours",
    "particle_size_nm",
    "temperature_c",
    "pressure_bar",
)


def get_database_path() -> Path:
    path = Path(os.getenv("DATABASE_PATH", str(DEFAULT_DATABASE_PATH)))
    return (path if path.is_absolute() else BACKEND_DIRECTORY / path).resolve()


@contextmanager
def connection(path=None):
    database_path = Path(path) if path is not None else get_database_path()
    database_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(database_path, timeout=5)
    db.row_factory = sqlite3.Row
    try:
        yield db
    finally:
        db.close()


def initialize_database(path=None, seed_demo=True):
    with connection(path) as db:
        # Lock before checking the version so concurrent startup cannot seed twice.
        db.execute("BEGIN IMMEDIATE")
        try:
            version = db.execute("PRAGMA user_version").fetchone()[0]
            if version == 1:
                db.commit()
                return
            if version != 0:
                raise sqlite3.DatabaseError("Unsupported database schema version")
            db.execute("""
                CREATE TABLE experiments (
                    id TEXT PRIMARY KEY NOT NULL,
                    material TEXT NOT NULL,
                    additive TEXT NOT NULL,
                    concentration_wt_pct REAL NOT NULL CHECK(concentration_wt_pct BETWEEN 0 AND 30),
                    preparation_method TEXT NOT NULL,
                    milling_hours REAL NOT NULL CHECK(milling_hours BETWEEN 0 AND 48),
                    particle_size_nm REAL NOT NULL CHECK(particle_size_nm BETWEEN 1 AND 1000),
                    temperature_c REAL NOT NULL CHECK(temperature_c BETWEEN 20 AND 500),
                    pressure_bar REAL NOT NULL CHECK(pressure_bar BETWEEN 0.1 AND 100),
                    hydrogen_capacity_wt_pct REAL NOT NULL CHECK(hydrogen_capacity_wt_pct BETWEEN 0 AND 100),
                    outcome TEXT NOT NULL CHECK(outcome IN ('Promising', 'Moderate', 'Limited')),
                    measurement_mode TEXT NOT NULL,
                    measurement_duration_minutes REAL NOT NULL CHECK(measurement_duration_minutes >= 0),
                    capacity_basis TEXT NOT NULL,
                    source_kind TEXT NOT NULL,
                    source_label TEXT NOT NULL,
                    source_reference TEXT NOT NULL,
                    is_demo INTEGER NOT NULL CHECK(is_demo IN (0, 1))
                )
            """)
            if seed_demo:
                records = json.loads(
                    Path(__file__)
                    .with_name("seed_data.json")
                    .read_text(encoding="utf-8")
                )
                for raw in records:
                    record = Experiment.model_validate(raw)
                    db.execute(
                        "INSERT INTO experiments VALUES (" + ",".join(["?"] * 18) + ")",
                        (
                            record.id,
                            *(getattr(record.inputs, key) for key in INPUT_COLUMNS),
                            record.hydrogen_capacity_wt_pct,
                            record.outcome,
                            record.measurement.mode,
                            record.measurement.duration_minutes,
                            record.measurement.capacity_basis,
                            record.source.kind,
                            record.source.label,
                            record.source.reference,
                            int(record.source.is_demo),
                        ),
                    )
            # Version 1 records the one-time seed decision, including disabled seeds.
            db.execute("PRAGMA user_version = 1")
            db.commit()
        except Exception:
            db.rollback()
            raise


def check_database_connection(path=None):
    with connection(path) as db:
        if db.execute("SELECT 1").fetchone()[0] != 1:
            raise sqlite3.DatabaseError("SQLite connectivity check failed")
