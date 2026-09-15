from __future__ import annotations

import sys
from pathlib import Path
import pytest


MODEL_DIR = Path(__file__).resolve().parents[1]
if str(MODEL_DIR) not in sys.path:
    sys.path.insert(0, str(MODEL_DIR))


def pytest_addoption(parser):
    parser.addoption("--run-refit", action="store_true", help="Opt in to the historical in-memory training reproducibility check")


def pytest_configure(config):
    config.addinivalue_line("markers", "refit: fits a model; excluded from ordinary release validation")


def pytest_collection_modifyitems(config, items):
    if not config.getoption("--run-refit"):
        for item in items:
            if "refit" in item.keywords:
                item.add_marker(pytest.mark.skip(reason="Refitting is opt-in; release validation uses the frozen artifact"))
