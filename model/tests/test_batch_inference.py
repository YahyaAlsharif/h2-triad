from unittest.mock import Mock
from predict import CapacityPredictor, predict_capacity
from test_artifact import supported_payload


def test_batch_matches_single_and_only_predicts_supported_rows():
    predictor = CapacityPredictor()
    payload = supported_payload()
    payloads = [payload, {**payload, 'temperature_c': 999}, {**payload, 'pressure_bar': None}, None]
    expected = [predict_capacity(value) for value in payloads]
    original = predictor.bundle.predict
    predictor.bundle.predict = Mock(wraps=original)
    assert predictor.predict_many(payloads) == expected
    assert predictor.bundle.predict.call_count == 1
    assert len(predictor.bundle.predict.call_args.args[0]) == 2
    predictor.bundle.predict.reset_mock()
    assert predictor.predict_many([]) == []
    predictor.predict_many([payloads[1], None])
    predictor.bundle.predict.assert_not_called()
