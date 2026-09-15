from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import ExtraTreesRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import ElasticNet, Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .features import ElementMultiHotEncoder, FeatureConfig, FeatureFrameTransformer, predictive_fields


RANDOM_SEED = 42
DEFAULT_CATBOOST_PARAMETERS = {
    "iterations": 350,
    "depth": 4,
    "learning_rate": 0.03,
    "l2_leaf_reg": 10.0,
}
DEFAULT_RANDOM_FOREST_PARAMETERS = {
    "n_estimators": 400,
    "max_depth": 6,
    "min_samples_leaf": 3,
    "min_samples_split": 6,
    "max_features": 0.7,
    "random_state": RANDOM_SEED,
    "n_jobs": 1,
}


def _estimator(model_name: str, parameters: dict[str, Any] | None = None):
    parameters = dict(parameters or {})
    if model_name == "dummy_median":
        return DummyRegressor(strategy="median", **parameters)
    if model_name == "ridge":
        return Ridge(**{"alpha": 10.0, **parameters})
    if model_name == "elastic_net":
        return ElasticNet(**{"alpha": 0.05, "l1_ratio": 0.2, "max_iter": 20000, "random_state": RANDOM_SEED, **parameters})
    if model_name == "random_forest":
        return RandomForestRegressor(
            **{
                **DEFAULT_RANDOM_FOREST_PARAMETERS,
                **parameters,
            }
        )
    if model_name == "extra_trees":
        return ExtraTreesRegressor(
            **{
                "n_estimators": 400,
                "max_depth": 6,
                "min_samples_leaf": 3,
                "min_samples_split": 6,
                "max_features": 0.7,
                "random_state": RANDOM_SEED,
                "n_jobs": 1,
                **parameters,
            }
        )
    if model_name == "catboost":
        try:
            from catboost import CatBoostRegressor
        except ImportError as error:
            raise RuntimeError("CatBoost is not installed") from error
        return CatBoostRegressor(
            **{
                **DEFAULT_CATBOOST_PARAMETERS,
                "loss_function": "RMSE",
                "random_seed": RANDOM_SEED,
                "verbose": False,
                "allow_writing_files": False,
                "thread_count": 1,
                **parameters,
            }
        )
    raise ValueError(f"Unknown model: {model_name}")


def make_pipeline(config: FeatureConfig, model_name: str, parameters: dict[str, Any] | None = None) -> Pipeline:
    predictive_fields(config)
    numeric_steps: list[tuple[str, Any]] = [("imputer", SimpleImputer(strategy="median"))]
    if model_name in {"ridge", "elastic_net"}:
        numeric_steps.append(("scaler", StandardScaler()))
    transformers: list[tuple[str, Any, list[str]]] = []
    if config.numeric:
        transformers.append(("numeric", Pipeline(numeric_steps), list(config.numeric)))
    if config.categorical:
        transformers.append(
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="constant", fill_value="__missing__", keep_empty_features=True)),
                        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                list(config.categorical),
            )
        )
    if config.include_elements:
        transformers.append(("elements", ElementMultiHotEncoder(), ["catalyst_elements"]))
    preprocessing = ColumnTransformer(transformers, remainder="drop", sparse_threshold=0.0)
    return Pipeline(
        [
            ("features", FeatureFrameTransformer()),
            ("preprocess", preprocessing),
            ("model", _estimator(model_name, parameters)),
        ]
    )


@dataclass
class CapacityModelBundle:
    pipeline: Any
    model_id: str
    feature_config: str
    algorithm: str
    metadata: dict[str, Any]
    support_profile: dict[str, Any]
    interval_quantiles: dict[str, Any] | None

    def predict(self, frame):
        return self.pipeline.predict(frame)


@dataclass
class PredictionEnsemble:
    pipelines: list[Any]
    weights: list[float]

    def predict(self, frame):
        import numpy as np

        member_predictions = np.vstack([pipeline.predict(frame) for pipeline in self.pipelines])
        return np.average(member_predictions, axis=0, weights=np.asarray(self.weights, dtype=float))


def save_bundle(bundle: CapacityModelBundle, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, path, compress=3)


def load_bundle(path: Path) -> CapacityModelBundle:
    bundle = joblib.load(path)
    if not isinstance(bundle, CapacityModelBundle):
        raise TypeError("Unexpected model artifact type")
    return bundle
