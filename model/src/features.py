from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Iterable

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin


FORBIDDEN_PREDICTIVE_FIELDS = {
    "measurement_id",
    "sample_id",
    "source_id",
    "paper_id",
    "experiment_group_id",
    "catalyst_system_group",
    "source_pdf_page",
    "source_locator",
    "extraction_type",
    "value_qualifier",
    "hydrogen_capacity_wt_pct",
}


@dataclass(frozen=True)
class FeatureConfig:
    name: str
    numeric: tuple[str, ...]
    categorical: tuple[str, ...]
    include_elements: bool = False

    def without(self, *fields: str, name: str | None = None) -> "FeatureConfig":
        removed = set(fields)
        return replace(
            self,
            name=name or self.name,
            numeric=tuple(value for value in self.numeric if value not in removed),
            categorical=tuple(value for value in self.categorical if value not in removed),
            include_elements=self.include_elements and "catalyst_elements" not in removed,
        )


COMPACT = FeatureConfig(
    "compact",
    ("temperature_c", "pressure_bar", "duration_seconds", "catalyst_loading_wt_pct"),
    ("measurement_mode",),
)
CONDITIONS = FeatureConfig(
    "conditions",
    (
        "temperature_c",
        "pressure_bar",
        "duration_seconds",
        "catalyst_loading_wt_pct",
        "pressure_missing",
        "loading_missing",
        "log_duration_seconds",
    ),
    ("measurement_mode", "preparation_method", "pressure_relation"),
)
FEATURE_A = FeatureConfig(
    "feature_a",
    (
        "temperature_c",
        "pressure_bar",
        "duration_seconds",
        "log_duration_seconds",
        "catalyst_loading_wt_pct",
        "milling_time_h",
        "milling_speed_rpm",
        "ball_to_powder_ratio_numeric",
        "pressure_missing",
        "loading_missing",
        "support_reported",
        "catalyst_present",
        "explicit_element_count",
        "explicit_component_count",
    ),
    (
        "measurement_mode",
        "catalyst_family",
        "support_material",
        "preparation_method",
        "pressure_relation",
    ),
    include_elements=True,
)
FEATURE_B = replace(
    FEATURE_A,
    name="feature_b",
    categorical=FEATURE_A.categorical + ("catalyst_additive", "catalyst_composition"),
)
FEATURE_A_INTERACTIONS = replace(
    FEATURE_A,
    name="feature_a_interactions",
    numeric=FEATURE_A.numeric + ("temperature_x_log_duration", "loading_x_temperature"),
)
FEATURE_A_DEPLOYMENT = FEATURE_A.without(
    "milling_time_h",
    "milling_speed_rpm",
    "ball_to_powder_ratio_numeric",
    "pressure_bar",
    "pressure_missing",
    "pressure_relation",
    "catalyst_elements",
    "explicit_element_count",
    "preparation_method",
    name="feature_a_deployment",
)
FEATURE_B_DEPLOYMENT = FEATURE_B.without(
    "milling_time_h",
    "milling_speed_rpm",
    "ball_to_powder_ratio_numeric",
    "pressure_bar",
    "pressure_missing",
    "pressure_relation",
    "catalyst_elements",
    "explicit_element_count",
    "preparation_method",
    name="feature_b_deployment",
)
FEATURE_A_DEPLOYMENT_INTERACTIONS = FEATURE_A_INTERACTIONS.without(
    "milling_time_h",
    "milling_speed_rpm",
    "ball_to_powder_ratio_numeric",
    "pressure_bar",
    "pressure_missing",
    "pressure_relation",
    "catalyst_elements",
    "explicit_element_count",
    "preparation_method",
    name="feature_a_deployment_interactions",
)
FEATURE_A_DEPLOYMENT_NO_FAMILY = FEATURE_A_DEPLOYMENT.without(
    "catalyst_family",
    name="feature_a_deployment_no_family",
)
FEATURE_B_DEPLOYMENT_NO_FAMILY = FEATURE_B_DEPLOYMENT.without(
    "catalyst_family",
    name="feature_b_deployment_no_family",
)
FEATURE_A_DEPLOYMENT_NO_FAMILY_INTERACTIONS = FEATURE_A_DEPLOYMENT_INTERACTIONS.without(
    "catalyst_family",
    name="feature_a_deployment_no_family_interactions",
)


def feature_config(name: str) -> FeatureConfig:
    configurations = {
        config.name: config
        for config in (
            COMPACT,
            CONDITIONS,
            FEATURE_A,
            FEATURE_B,
            FEATURE_A_INTERACTIONS,
            FEATURE_A_DEPLOYMENT,
            FEATURE_B_DEPLOYMENT,
            FEATURE_A_DEPLOYMENT_INTERACTIONS,
            FEATURE_A_DEPLOYMENT_NO_FAMILY,
            FEATURE_B_DEPLOYMENT_NO_FAMILY,
            FEATURE_A_DEPLOYMENT_NO_FAMILY_INTERACTIONS,
        )
    }
    try:
        return configurations[name]
    except KeyError as error:
        raise ValueError(f"Unknown feature configuration: {name}") from error


def predictive_fields(config: FeatureConfig) -> set[str]:
    fields = set(config.numeric).union(config.categorical)
    if config.include_elements:
        fields.add("catalyst_elements")
    overlap = fields.intersection(FORBIDDEN_PREDICTIVE_FIELDS)
    if overlap:
        raise ValueError(f"Metadata cannot be predictive: {sorted(overlap)}")
    return fields


def _text(value: object) -> str | float:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    text = str(value).strip()
    return text if text else np.nan


def _tokens(value: object) -> list[str]:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return []
    return sorted({token.strip() for token in str(value).split("|") if token.strip()})


def parse_ball_to_powder_ratio(value: object) -> float:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        return np.nan
    if ":" not in text:
        try:
            return float(text)
        except ValueError:
            return np.nan
    numerator, denominator = text.split(":", 1)
    try:
        numerator_value = float(numerator)
        denominator_value = float(denominator)
    except ValueError:
        return np.nan
    if denominator_value <= 0:
        return np.nan
    return numerator_value / denominator_value


class FeatureFrameTransformer(BaseEstimator, TransformerMixin):
    def fit(self, X: pd.DataFrame, y: object = None) -> "FeatureFrameTransformer":
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        frame = X.copy()
        for column in (
            "temperature_c",
            "pressure_bar",
            "duration_seconds",
            "catalyst_loading_wt_pct",
            "milling_time_h",
            "milling_speed_rpm",
        ):
            if column not in frame:
                frame[column] = np.nan
            frame[column] = pd.to_numeric(frame[column], errors="coerce")
        for column in (
            "measurement_mode",
            "catalyst_family",
            "support_material",
            "preparation_method",
            "pressure_relation",
            "catalyst_additive",
            "catalyst_composition",
            "catalyst_components",
            "catalyst_elements",
        ):
            if column not in frame:
                frame[column] = np.nan
            frame[column] = frame[column].map(_text)

        frame["ball_to_powder_ratio_numeric"] = frame.get(
            "ball_to_powder_ratio", pd.Series(np.nan, index=frame.index)
        ).map(parse_ball_to_powder_ratio)
        frame["pressure_missing"] = frame["pressure_bar"].isna().astype(float)
        frame["loading_missing"] = frame["catalyst_loading_wt_pct"].isna().astype(float)
        frame["support_reported"] = frame["support_material"].notna().astype(float)
        frame["catalyst_present"] = (~frame["catalyst_family"].fillna("none").eq("none")).astype(float)
        frame["explicit_element_count"] = frame["catalyst_elements"].map(lambda value: len(_tokens(value))).astype(float)
        frame["explicit_component_count"] = frame["catalyst_components"].map(lambda value: len(_tokens(value))).astype(float)
        frame["log_duration_seconds"] = np.log1p(frame["duration_seconds"].clip(lower=0))
        frame["temperature_x_log_duration"] = frame["temperature_c"] * frame["log_duration_seconds"]
        frame["loading_x_temperature"] = frame["catalyst_loading_wt_pct"] * frame["temperature_c"]
        return frame


class ElementMultiHotEncoder(BaseEstimator, TransformerMixin):
    def fit(self, X: object, y: object = None) -> "ElementMultiHotEncoder":
        values = self._values(X)
        self.classes_ = np.asarray(sorted({token for value in values for token in _tokens(value)}), dtype=object)
        return self

    def transform(self, X: object) -> np.ndarray:
        values = self._values(X)
        vocabulary = {value: index for index, value in enumerate(self.classes_)}
        result = np.zeros((len(values), len(self.classes_)), dtype=float)
        for row_index, value in enumerate(values):
            for token in _tokens(value):
                if token in vocabulary:
                    result[row_index, vocabulary[token]] = 1.0
        return result

    def get_feature_names_out(self, input_features: Iterable[str] | None = None) -> np.ndarray:
        return np.asarray([f"element_{value}" for value in self.classes_], dtype=object)

    @staticmethod
    def _values(X: object) -> list[object]:
        if isinstance(X, pd.DataFrame):
            return X.iloc[:, 0].tolist()
        if isinstance(X, pd.Series):
            return X.tolist()
        array = np.asarray(X, dtype=object)
        return array.reshape(-1).tolist()
