"""Explicit domain contracts. Bounds are UI limits, not laboratory guidance."""

from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StrictStr


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Inputs(Contract):
    material: StrictStr = Field(min_length=1, max_length=100)
    additive: StrictStr = Field(min_length=1, max_length=100)
    concentration_wt_pct: float = Field(strict=True, ge=0, le=30)
    preparation_method: StrictStr = Field(min_length=1, max_length=100)
    milling_hours: float = Field(strict=True, ge=0, le=48)
    particle_size_nm: float = Field(strict=True, ge=1, le=1000)
    temperature_c: float = Field(strict=True, ge=20, le=500)
    pressure_bar: float = Field(strict=True, ge=0.1, le=100)


class Measurement(Contract):
    mode: str = Field(min_length=1)
    duration_minutes: float = Field(ge=0)
    capacity_basis: str = Field(min_length=1)


class Source(Contract):
    kind: str = Field(min_length=1)
    label: str = Field(min_length=1)
    reference: str = Field(min_length=1)
    is_demo: bool


ExperimentId = Annotated[str, Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")]


class Experiment(Contract):
    id: ExperimentId
    inputs: Inputs
    hydrogen_capacity_wt_pct: float = Field(ge=0, le=100)
    outcome: Literal["Promising", "Moderate", "Limited"]
    measurement: Measurement
    source: Source


class ExperimentList(Contract):
    items: list[Experiment]


class SelectOption(Contract):
    value: str
    allows_loading: bool | None = None
    allows_milling: bool | None = None


class NumericConstraint(Contract):
    min: float
    max: float
    step: float


class DomainOptions(Contract):
    materials: list[str]
    additives: list[SelectOption]
    methods: list[SelectOption]
    numeric_constraints: dict[str, NumericConstraint]
    default_inputs: Inputs | None
