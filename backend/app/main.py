import logging
import os
import sqlite3
from contextlib import asynccontextmanager
from typing import Literal
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
from app.database import (
    check_database_connection,
    get_database_path,
    initialize_database,
)
from app.domain import router

logger = logging.getLogger(__name__)


class HealthResponse(BaseModel):
    status: Literal["ok", "error"]
    api: Literal["connected"]
    database: Literal["connected", "disconnected"]


def create_app(database_path=None, seed_demo=None):
    @asynccontextmanager
    async def lifespan(application):
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
        version="0.3.0",
        lifespan=lifespan,
        description="Persistent synthetic/demo experiments and exact dataset lookup. No trained model.",
    )
    application.include_router(router)

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

    return application


app = create_app()
