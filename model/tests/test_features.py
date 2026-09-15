from __future__ import annotations

import numpy as np

from src.data import TARGET, load_capacity_data, logo_splits
from src.features import (
    FEATURE_A_DEPLOYMENT,
    FORBIDDEN_PREDICTIVE_FIELDS,
    ElementMultiHotEncoder,
    FeatureFrameTransformer,
    predictive_fields,
)
from src.modeling import DEFAULT_RANDOM_FOREST_PARAMETERS, make_pipeline


def test_metadata_ids_are_not_predictive_features():
    assert predictive_fields(FEATURE_A_DEPLOYMENT).isdisjoint(FORBIDDEN_PREDICTIVE_FIELDS)


def test_element_multihot_is_deterministic():
    first = ElementMultiHotEncoder().fit(np.asarray([["Ni|Zn|C"], ["Mg|Ni"]], dtype=object))
    second = ElementMultiHotEncoder().fit(np.asarray([["Mg|Ni"], ["C|Zn|Ni"]], dtype=object))
    assert first.get_feature_names_out().tolist() == second.get_feature_names_out().tolist()
    np.testing.assert_array_equal(
        first.transform(np.asarray([["Ni|Zn|C"]], dtype=object)),
        second.transform(np.asarray([["C|Ni|Zn"]], dtype=object)),
    )


def test_real_zero_loading_is_distinct_from_missing_loading():
    frame = load_capacity_data().iloc[[0, 1]].copy()
    frame.iloc[0, frame.columns.get_loc("catalyst_loading_wt_pct")] = 0.0
    frame.iloc[1, frame.columns.get_loc("catalyst_loading_wt_pct")] = np.nan
    transformed = FeatureFrameTransformer().transform(frame)
    assert transformed.iloc[0]["catalyst_loading_wt_pct"] == 0.0
    assert transformed.iloc[0]["loading_missing"] == 0.0
    assert np.isnan(transformed.iloc[1]["catalyst_loading_wt_pct"])
    assert transformed.iloc[1]["loading_missing"] == 1.0


def test_preprocessing_is_fitted_only_on_training_papers():
    frame = load_capacity_data()
    found_exclusive = False
    for train_index, test_index in logo_splits(frame):
        training_families = set(frame.iloc[train_index]["catalyst_family"])
        exclusive = set(frame.iloc[test_index]["catalyst_family"]).difference(training_families)
        if not exclusive:
            continue
        pipeline = make_pipeline(FEATURE_A_DEPLOYMENT, "random_forest", DEFAULT_RANDOM_FOREST_PARAMETERS)
        pipeline.fit(frame.iloc[train_index], frame.iloc[train_index][TARGET])
        categorical = pipeline.named_steps["preprocess"].named_transformers_["categorical"]
        onehot = categorical.named_steps["onehot"]
        family_index = list(FEATURE_A_DEPLOYMENT.categorical).index("catalyst_family")
        assert exclusive.isdisjoint(set(onehot.categories_[family_index]))
        found_exclusive = True
        break
    assert found_exclusive


def test_fixed_seed_repeats_predictions():
    frame = load_capacity_data()
    first = make_pipeline(FEATURE_A_DEPLOYMENT, "random_forest", DEFAULT_RANDOM_FOREST_PARAMETERS)
    second = make_pipeline(FEATURE_A_DEPLOYMENT, "random_forest", DEFAULT_RANDOM_FOREST_PARAMETERS)
    first.fit(frame, frame[TARGET])
    second.fit(frame, frame[TARGET])
    np.testing.assert_allclose(first.predict(frame), second.predict(frame), rtol=0, atol=0)
