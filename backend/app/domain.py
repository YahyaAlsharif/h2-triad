from typing import Annotated
from fastapi import APIRouter, HTTPException, Path, Request
from app.repository import get_experiments, get_options
from app.schemas import (
    DomainOptions,
    Experiment,
    ExperimentList,
    MatchedRun,
    RunRequest,
    RunResponse,
    UnavailableRun,
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


@router.post("/digital-twin/run", response_model=RunResponse)
def run_digital_twin(body: RunRequest, request: Request):
    path = database_path(request)
    options = get_options(path)
    inputs = body.inputs
    for name, allowed in (
        ("material", options.materials),
        ("additive", [item.value for item in options.additives]),
        ("preparation_method", [item.value for item in options.methods]),
    ):
        if getattr(inputs, name) not in allowed:
            raise HTTPException(422, f"Select an available {name.replace('_', ' ')}.")
    additive = next(item for item in options.additives if item.value == inputs.additive)
    method = next(
        item for item in options.methods if item.value == inputs.preparation_method
    )
    if not additive.allows_loading and inputs.concentration_wt_pct != 0:
        raise HTTPException(
            422, "An additive-free configuration requires zero additive loading."
        )
    if not method.allows_milling and inputs.milling_hours != 0:
        raise HTTPException(
            422, "This preparation option requires zero ball milling time."
        )
    records = get_experiments(path, inputs=inputs)
    return (
        MatchedRun(inputs=inputs, items=records)
        if records
        else UnavailableRun(inputs=inputs)
    )
