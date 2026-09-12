import sqlite3
from typing import Literal

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.database import check_database_connection


app = FastAPI(
    title="H2-TRIAD API",
    description="Phase 1 technical foundation for the H2-TRIAD digital twin.",
    version="0.1.0",
)


class HealthResponse(BaseModel):
    status: Literal["ok", "error"]
    api: Literal["connected"]
    database: Literal["connected", "disconnected"]


@app.get(
    "/api/health",
    tags=["system"],
    response_model=HealthResponse,
    responses={503: {"description": "SQLite is unavailable"}},
)
def health_check():
    """Report API availability and verify a live SQLite connection."""
    try:
        check_database_connection()
    except (OSError, sqlite3.Error):
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "api": "connected",
                "database": "disconnected",
            },
        )

    return HealthResponse(status="ok", api="connected", database="connected")
