import os
import sqlite3
from pathlib import Path


BACKEND_DIRECTORY = Path(__file__).resolve().parents[1]
DEFAULT_DATABASE_PATH = BACKEND_DIRECTORY / "data" / "app.db"


def get_database_path() -> Path:
    """Return the configured SQLite path, relative to the backend directory."""
    configured_path = Path(os.getenv("DATABASE_PATH", str(DEFAULT_DATABASE_PATH)))
    if not configured_path.is_absolute():
        configured_path = BACKEND_DIRECTORY / configured_path
    return configured_path.resolve()


def check_database_connection() -> None:
    """Open SQLite and execute a minimal query to prove it is usable."""
    database_path = get_database_path()
    database_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(database_path) as connection:
        result = connection.execute("SELECT 1").fetchone()

    if result != (1,):
        raise sqlite3.DatabaseError("SQLite connectivity check returned an unexpected result")

