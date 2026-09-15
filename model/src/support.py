from __future__ import annotations

import math
from typing import Any

import pandas as pd


NUMERIC_FIELDS = (
    "temperature_c",
    "pressure_bar",
    "duration_seconds",
    "catalyst_loading_wt_pct",
    "milling_time_h",
    "milling_speed_rpm",
)


def _clean_values(series: pd.Series) -> list[str]:
    return sorted({str(value).strip() for value in series if pd.notna(value) and str(value).strip()})


def create_support_profile(frame: pd.DataFrame) -> dict[str, Any]:
    modes: dict[str, Any] = {}
    for mode, part in frame.groupby("measurement_mode", sort=True):
        ranges: dict[str, Any] = {}
        for field in ("temperature_c", "pressure_bar", "duration_seconds", "catalyst_loading_wt_pct"):
            values = pd.to_numeric(part[field], errors="coerce").dropna()
            ranges[field] = {
                "min": float(values.min()) if len(values) else None,
                "max": float(values.max()) if len(values) else None,
                "known_rows": int(len(values)),
                "missing_allowed": bool(part[field].isna().any()),
            }
        modes[str(mode)] = {"rows": int(len(part)), "ranges": ranges}
    elements = sorted(
        {
            token.strip()
            for value in frame["catalyst_elements"].fillna("")
            for token in str(value).split("|")
            if token.strip()
        }
    )
    return {
        "version": "1.0",
        "model_id": "h2-triad-capacity-v1",
        "measurement_modes": modes,
        "catalyst_families": _clean_values(frame["catalyst_family"]),
        "known_elements": elements,
        "support_materials": _clean_values(frame["support_material"]),
        "preparation_methods": _clean_values(frame["preparation_method"]),
        "pressure_relations": _clean_values(frame["pressure_relation"]),
        "missing_policy": {
            "pressure": "allowed with warning only for modes with missing-pressure training examples",
            "loading": "allowed with warning only for modes with missing-loading training examples",
            "zero_loading": "preserved as a reported control value and never treated as missing",
        },
    }


def _coerce_number(payload: dict[str, Any], field: str, required: bool) -> tuple[float | None, str | None]:
    value = payload.get(field)
    if value is None or value == "":
        return (None, f"missing_required_{field}" if required else None)
    if isinstance(value, bool):
        return None, f"malformed_{field}"
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None, f"malformed_{field}"
    if not math.isfinite(number):
        return None, f"malformed_{field}"
    return number, None


def _element_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return sorted({token.strip() for token in value.split("|") if token.strip()})
    if isinstance(value, list) and all(isinstance(token, str) for token in value):
        return sorted({token.strip() for token in value if token.strip()})
    return []


def validate_support(payload: dict[str, Any], profile: dict[str, Any]) -> tuple[bool, list[str], list[str], dict[str, Any]]:
    reasons: list[str] = []
    warnings: list[str] = []
    normalized = dict(payload)
    mode = payload.get("measurement_mode")
    if mode not in profile["measurement_modes"]:
        reasons.append("unknown_measurement_mode")
        return False, reasons, warnings, normalized
    mode_profile = profile["measurement_modes"][mode]

    required_numeric = {"temperature_c", "duration_seconds"}
    for field in NUMERIC_FIELDS:
        number, error = _coerce_number(payload, field, field in required_numeric)
        normalized[field] = number
        if error:
            reasons.append(error)
            continue
        if number is not None and number < 0:
            reasons.append(f"negative_{field}")

    for field in ("temperature_c", "pressure_bar", "duration_seconds", "catalyst_loading_wt_pct"):
        value = normalized.get(field)
        rule = mode_profile["ranges"][field]
        if value is None:
            if field in {"pressure_bar", "catalyst_loading_wt_pct"}:
                if rule["missing_allowed"]:
                    warnings.append(f"{field}_missing")
                else:
                    reasons.append(f"unsupported_missing_{field}")
            continue
        if rule["min"] is not None and (value < rule["min"] or value > rule["max"]):
            reasons.append(f"{field}_outside_{mode}_range")

    family = str(payload.get("catalyst_family") or "").strip()
    if not family:
        reasons.append("missing_catalyst_family")
    elif family not in profile["catalyst_families"]:
        reasons.append("unseen_catalyst_family")
    normalized["catalyst_family"] = family or None

    elements_value = payload.get("catalyst_elements")
    elements = _element_list(elements_value)
    if elements_value is not None and not elements and elements_value not in ("", []):
        reasons.append("malformed_catalyst_elements")
    if not elements:
        reasons.append("missing_catalyst_elements")
    else:
        known = set(profile["known_elements"])
        overlap = known.intersection(elements)
        if not overlap:
            reasons.append("catalyst_elements_entirely_unseen")
        elif not set(elements).issubset(known):
            warnings.append("some_catalyst_elements_unseen")
    normalized["catalyst_elements"] = "|".join(elements) if elements else None

    components_value = payload.get("catalyst_components")
    components = _element_list(components_value)
    if family != "none" and not components:
        reasons.append("missing_catalyst_components")
    normalized["catalyst_components"] = "|".join(components) if components else None

    ratio = payload.get("ball_to_powder_ratio")
    if ratio not in (None, ""):
        text = str(ratio).strip()
        try:
            if ":" in text:
                numerator, denominator = (float(value) for value in text.split(":", 1))
                valid_ratio = numerator >= 0 and denominator > 0
            else:
                valid_ratio = float(text) >= 0
        except (TypeError, ValueError):
            valid_ratio = False
        if not valid_ratio:
            reasons.append("malformed_ball_to_powder_ratio")

    for field, vocabulary_key in (
        ("preparation_method", "preparation_methods"),
        ("support_material", "support_materials"),
    ):
        value = str(payload.get(field) or "").strip()
        normalized[field] = value or None
        if value and value not in profile[vocabulary_key]:
            warnings.append(f"unseen_{field}")

    return not reasons, sorted(set(reasons)), sorted(set(warnings)), normalized
