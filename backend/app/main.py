import logging
import os
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ValidationError
from app.database import (
    check_database_connection,
    get_database_path,
    initialize_database,
)
from app.domain import router
from app.scientific import ScientificService, router as scientific_router

logger = logging.getLogger(__name__)
DEFAULT_STATIC_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"


class HealthResponse(BaseModel):
    status: Literal["ok", "error"]
    api: Literal["connected"]
    database: Literal["connected", "disconnected"]


def create_app(
    database_path=None,
    seed_demo=None,
    scientific_factory=ScientificService,
    static_dir=DEFAULT_STATIC_DIR,
):
    @asynccontextmanager
    async def lifespan(application):
        application.state.scientific = scientific_factory()
        application.state.database_path = database_path or get_database_path()
        application.state.database_ready = False
        try:
            initialize_database(
                application.state.database_path,
                (
                    seed_demo
                    if seed_demo is not None
                    else os.getenv("SEED_DEMO_DATA", "true").lower() == "true"
                ),
            )
            application.state.database_ready = True
        except (OSError, sqlite3.Error, ValueError):
            logger.exception("Domain database initialization failed")
        yield

    application = FastAPI(
        title="H2-TRIAD API",
        version="0.5.0",
        lifespan=lifespan,
        description="Literature evidence, supported capacity predictions, and a model response landscape. Separate synthetic/demo explorer.",
    )
    application.include_router(router)
    application.include_router(scientific_router)

    @application.exception_handler(RequestValidationError)
    async def invalid_request(request, error):
        # Do not echo arbitrary request bodies or internal exception contexts.
        return JSONResponse(
            status_code=422,
            content={
                "detail": [
                    {"loc": list(item["loc"]), "msg": item["msg"], "type": item["type"]}
                    for item in error.errors()
                ]
            },
        )

    async def database_error(request, error):
        logger.error("Domain database operation failed", exc_info=error)
        return JSONResponse(
            status_code=503,
            content={"detail": "Domain database is unavailable. Try again later."},
        )

    async def internal_error(request, error):
        logger.error("Invalid stored data or internal API error", exc_info=error)
        return JSONResponse(
            status_code=500,
            content={"detail": "The API could not complete this request."},
        )

    for kind in (sqlite3.Error, OSError):
        application.add_exception_handler(kind, database_error)
    for kind in (ValidationError, ResponseValidationError, Exception):
        application.add_exception_handler(kind, internal_error)

    @application.get(
        "/api/health",
        tags=["system"],
        response_model=HealthResponse,
        responses={503: {"description": "SQLite is unavailable"}},
    )
    def health_check(request: Request):
        try:
            check_database_connection(request.app.state.database_path)
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

    # The compiled frontend is optional so API-only local development and tests do
    # not need a Node build. Register this last: concrete API/docs routes win first.
    frontend = Path(static_dir) if static_dir is not None else None
    if frontend and (frontend / "index.html").is_file():
        assets = frontend / "assets"
        if assets.is_dir():
            application.mount("/assets", StaticFiles(directory=assets), name="assets")

        @application.get("/{frontend_path:path}", include_in_schema=False)
        def frontend_app(frontend_path: str):
            # Unknown API paths remain API failures instead of becoming the SPA.
            if frontend_path == "api" or frontend_path.startswith("api/"):
                return JSONResponse(status_code=404, content={"detail": "Not Found"})
            return FileResponse(frontend / "index.html")

    return application


app = create_app()
