from typing import Annotated
from fastapi import APIRouter, HTTPException, Path, Request
from app.repository import get_experiments, get_options
from app.schemas import (
    DomainOptions,
    Experiment,
    ExperimentList,
)

router = APIRouter(prefix="/api", tags=["domain"])


def database_path(request):
    if not request.app.state.database_ready:
        raise HTTPException(
            503,
            "Domain database is unavailable. Restart the backend after restoring database access.",
        )
    return request.app.state.database_path


@router.get("/experiments", response_model=ExperimentList)
def list_experiments(request: Request):
    return ExperimentList(items=get_experiments(database_path(request)))


@router.get("/experiments/{experiment_id}", response_model=Experiment)
def experiment_detail(
    request: Request,
    experiment_id: Annotated[str, Path(pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")],
):
    records = get_experiments(database_path(request), experiment_id=experiment_id)
    if not records:
        raise HTTPException(404, "Experiment not found")
    return records[0]


@router.get("/domain/options", response_model=DomainOptions)
def domain_options(request: Request):
    return get_options(database_path(request))
