"""Playwright-only server. Never opens the developer's runtime database."""

import sys
from pathlib import Path
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import uvicorn
from app.main import create_app

with TemporaryDirectory(prefix="h2-triad-browser-") as directory:
    uvicorn.run(
        create_app(Path(directory) / "browser.db", seed_demo=True),
        host="127.0.0.1",
        port=8001,
    )
