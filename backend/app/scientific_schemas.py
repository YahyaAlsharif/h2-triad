"""Scientific contracts are separate from the historical SQLite demo schema."""

from typing import Annotated, Literal
from pydantic import Field, StrictStr, field_validator, model_validator
from app.schemas import Contract

FiniteNumber = Annotated[float, Field(strict=True)]
ShortText = Annotated[StrictStr, Field(max_length=300)]


class ScientificInputs(Contract):
    base_material: Literal["MgH2"] = "MgH2"
    sample_id: Annotated[StrictStr, Field(pattern=r"^[A-Za-z0-9_-]{1,80}$")] | None = None
    measurement_mode: ShortText
    temperature_c: FiniteNumber | None
    temperature_reported: ShortText | None = None
    duration_seconds: FiniteNumber
    catalyst_loading_wt_pct: FiniteNumber | None
    catalyst_family: ShortText
    catalyst_elements: ShortText
    catalyst_components: ShortText
    support_material: ShortText | None = None
    pressure_bar: FiniteNumber | None
    pressure_relation: Literal["=", "<", ">", "<=", ">="] | None = None
    preparation_method: ShortText | None = None

    @field_validator("catalyst_elements", "catalyst_components")
    @classmethod
    def tokens(cls, value):
        return "|".join(sorted({part.strip() for part in value.split("|") if part.strip()}))

    @model_validator(mode="after")
    def coherent_conditions(self):
        if self.temperature_c is None and not (self.sample_id and self.temperature_reported):
            raise ValueError("A numeric temperature is required for a custom configuration")
        if self.temperature_c is not None and self.temperature_reported is not None:
            raise ValueError("Use a numeric temperature or a reported condition, not both")
        if self.pressure_bar is None and self.pressure_relation is not None:
            raise ValueError("A pressure relation requires a numeric pressure")
        if self.pressure_bar is not None and self.pressure_relation is None:
            raise ValueError("Specify the numeric pressure relation")
        return self


class ScientificRunRequest(Contract):
    inputs: ScientificInputs


class Support(Contract):
    supported: bool
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class Prediction(Contract):
    hydrogen_capacity_wt_pct: FiniteNumber
    empirical_interval_90_wt_pct: tuple[FiniteNumber, FiniteNumber] | None = None


class Provenance(Contract):
    source_id: str
    paper_id: str
    title: str
    doi: str
    year: str
    source_pdf_page: str
    source_locator: str
    extraction_type: str
    extraction_note: str


class LiteratureObservation(Contract):
    measurement_id: str
    sample_label: str
    inputs: ScientificInputs
    hydrogen_capacity_wt_pct: FiniteNumber | None
    capacity_lower_wt_pct: FiniteNumber | None
    capacity_upper_wt_pct: FiniteNumber | None
    reported_uncertainty_wt_pct: FiniteNumber | None
    value_qualifier: str
    capacity_basis: str
    temperature_raw: str
    pressure_raw: str
    duration_raw: str
    sample_note: str
    preparation: dict[str, str]
    source: Provenance


class LiteratureRun(Contract):
    status: Literal["literature"] = "literature"
    inputs: ScientificInputs
    items: list[LiteratureObservation] = Field(min_length=1)


class PredictedRun(Contract):
    status: Literal["predicted"] = "predicted"
    inputs: ScientificInputs
    model_id: str
    prediction: Prediction
    support: Support


class ScientificUnavailable(Contract):
    status: Literal["unavailable"] = "unavailable"
    inputs: ScientificInputs
    reason: str
    prediction: None = None
    support: Support


ScientificRun = Annotated[LiteratureRun | PredictedRun | ScientificUnavailable, Field(discriminator="status")]
AxisName = Literal["temperature_c", "catalyst_loading_wt_pct"]


class LandscapeRequest(ScientificRunRequest):
    x_variable: AxisName = "temperature_c"
    y_variable: AxisName = "catalyst_loading_wt_pct"
    x_points: Annotated[int, Field(strict=True, ge=2, le=40)] = 20
    y_points: Annotated[int, Field(strict=True, ge=2, le=40)] = 20
    x_range: tuple[FiniteNumber, FiniteNumber] | None = None
    y_range: tuple[FiniteNumber, FiniteNumber] | None = None

    @model_validator(mode="after")
    def grid(self):
        if self.x_variable == self.y_variable:
            raise ValueError("Landscape axes must differ")
        for bounds in (self.x_range, self.y_range):
            if bounds and not (0 <= bounds[0] < bounds[1] <= 10000):
                raise ValueError("Axis ranges must be increasing and between 0 and 10000")
        return self


class LandscapeResponse(Contract):
    inputs: ScientificInputs
    model_id: str
    x_variable: AxisName
    y_variable: AxisName
    x: list[FiniteNumber]
    y: list[FiniteNumber]
    z: list[list[FiniteNumber | None]]
    intervals: list[list[tuple[FiniteNumber, FiniteNumber] | None]]
    supported: list[list[bool]]
    reasons: list[list[list[str]]]
    warnings: list[list[list[str]]]
    supported_cells: int
    total_cells: int
    selected: PredictedRun | ScientificUnavailable
    support_profile_version: str


class LiteratureList(Contract):
    items: list[LiteratureObservation]
