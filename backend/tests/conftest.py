import pytest
from fastapi.testclient import TestClient
from app.main import create_app


@pytest.fixture
def database_path(tmp_path):
    return tmp_path / "isolated.db"


@pytest.fixture
def client(database_path):
    with TestClient(create_app(database_path)) as instance:
        yield instance
