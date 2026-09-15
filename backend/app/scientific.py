"""Scientific application boundary: evidence first, then the unchanged model contract."""

import hashlib
import json
import logging
from pathlib import Path
from threading import Lock

from fastapi import APIRouter, HTTPException, Request
from app.literature import DATASET, LiteratureIndex
from app.scientific_schemas import (
    LandscapeRequest, LandscapeResponse, LiteratureList, LiteratureRun,
    ScientificRun, ScientificRunRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["scientific"])
ARTIFACTS = Path(__file__).resolve().parents[2] / "model" / "artifacts"


class ScientificService:
    def __init__(self, dataset=DATASET, artifacts=ARTIFACTS):
        self.literature = None
        self.predictor = None
        self.metadata = None
        self.profile = None
        self.lock = Lock()
        try:
            self.literature = LiteratureIndex(dataset)
        except Exception:
            logger.exception("Literature initialization failed")
        try:
            from model.predict import CapacityPredictor
            metadata = json.loads((artifacts / "model_metadata.json").read_text(encoding="utf-8"))
            profile = json.loads((artifacts / "support_profile.json").read_text(encoding="utf-8"))
            predictor = CapacityPredictor(artifacts / "capacity_model.joblib")
            bundle = predictor.bundle
            fingerprint = hashlib.sha256((dataset / "processed" / "capacity_training.csv").read_bytes()).hexdigest()
            if (bundle.model_id != metadata["model_id"] or bundle.support_profile != profile
                    or bundle.metadata != metadata or metadata["dataset_sha256"] != fingerprint
                    or bundle.feature_config != metadata["feature_set"]
                    or bundle.algorithm != metadata["algorithm"]):
                raise ValueError("Model, metadata and dataset disagree")
            self.metadata, self.profile, self.predictor = metadata, profile, predictor
        except Exception:
            logger.exception("Capacity model initialization failed")

    def require_literature(self):
        if self.literature is None:
            raise HTTPException(503, "Literature evidence is unavailable. Please retry later.")
        return self.literature

    def require_model(self):
        if self.predictor is None:
            raise HTTPException(503, "The capacity model is unavailable. Please retry later.")
        return self.predictor

    def infer(self, payloads):
        predictor = self.require_model()
        try:
            # Bound concurrent native inference; one batch per landscape, no mutable fit state.
            with self.lock:
                return predictor.predict_many(payloads)
        except Exception:
            logger.exception("Capacity inference failed")
            raise HTTPException(503, "The capacity model could not complete this request. Please retry.")

    def run(self, inputs):
        literature = self.require_literature()
        if inputs.sample_id is not None and inputs.sample_id not in literature.samples:
            raise HTTPException(422, "Unknown literature sample.")
        matches = literature.match(inputs)
        if matches:
            return LiteratureRun(inputs=inputs, items=matches)
        return {"inputs": inputs, **self.infer([model_payload(inputs)])[0]}


def model_payload(inputs):
    # Provenance is application context, never a predictive feature.
    return inputs.model_dump(exclude={"sample_id", "base_material", "temperature_reported"})


def service(request):
    return request.app.state.scientific


@router.get("/scientific/readiness")
def readiness(request: Request):
    instance = service(request)
    state = {"literature": instance.literature is not None, "model": instance.predictor is not None}
    if not all(state.values()):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content={"status": "unavailable", **state})
    return {"status": "ready", **state, "model_id": instance.metadata["model_id"]}


@router.get("/literature/measurements", response_model=LiteratureList)
def literature_measurements(request: Request):
    return {"items": service(request).require_literature().items}


@router.get("/digital-twin/options")
def scientific_options(request: Request):
    instance = service(request)
    evidence = instance.require_literature()
    instance.require_model()
    # A real configuration supplies defaults, without claiming that a custom sample is identical.
    default = next(item for item in evidence.items if item.inputs.measurement_mode == "absorption"
                   and item.inputs.temperature_c is not None and item.inputs.pressure_bar is not None)
    return {
        "default_inputs": default.inputs.model_copy(update={"sample_id": None, "preparation_method": None}),
        "support_profile": instance.profile,
        "model": instance.metadata,
        "landscape": {"default_points": 20, "min_points": 2, "max_points": 40,
                      "axes": ["temperature_c", "catalyst_loading_wt_pct"]},
    }


@router.post("/digital-twin/run", response_model=ScientificRun, response_model_exclude_none=False)
def run(body: ScientificRunRequest, request: Request):
    return service(request).run(body.inputs)


@router.post("/digital-twin/landscape", response_model=LandscapeResponse)
def landscape(body: LandscapeRequest, request: Request):
    instance = service(request)
    instance.require_model()
    profile = instance.profile
    mode = profile["measurement_modes"].get(body.inputs.measurement_mode)
    if mode is None:
        raise HTTPException(422, "Select absorption or desorption for the landscape.")
    if body.inputs.temperature_c is None:
        raise HTTPException(422, "A numeric temperature is required to mark the selected configuration.")

    def axis(name, count, supplied):
        rule = mode["ranges"][name]
        low, high = supplied or (rule["min"], rule["max"])
        # Keep exact endpoints; never round a node into/out of support.
        return [low + (high - low) * index / (count - 1) for index in range(count - 1)] + [high]

    x = axis(body.x_variable, body.x_points, body.x_range)
    y = axis(body.y_variable, body.y_points, body.y_range)
    fixed = model_payload(body.inputs)
    rows = [{**fixed, body.x_variable: xv, body.y_variable: yv} for yv in y for xv in x]
    results = instance.infer(rows + [fixed])
    selected = {"inputs": body.inputs, **results.pop()}

    def matrix(values):
        return [values[index:index + len(x)] for index in range(0, len(values), len(x))]

    supported = [item["status"] == "predicted" for item in results]
    return {
        "inputs": body.inputs, "model_id": instance.metadata["model_id"],
        "x_variable": body.x_variable, "y_variable": body.y_variable, "x": x, "y": y,
        "z": matrix([(item.get("prediction") or {}).get("hydrogen_capacity_wt_pct") for item in results]),
        "intervals": matrix([(item.get("prediction") or {}).get("empirical_interval_90_wt_pct") for item in results]),
        "supported": matrix(supported),
        "reasons": matrix([item["support"].get("reasons", []) for item in results]),
        "warnings": matrix([item["support"].get("warnings", []) for item in results]),
        "supported_cells": sum(supported), "total_cells": len(results), "selected": selected,
        "support_profile_version": profile["version"],
    }
