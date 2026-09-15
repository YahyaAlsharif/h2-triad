import json
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.scientific import ARTIFACTS, ScientificService, model_payload
from app.scientific_schemas import ScientificInputs
from model.predict import predict_capacity


def defaults(client):
    response = client.get('/api/digital-twin/options')
    assert response.status_code == 200
    return response.json()['default_inputs']


def observations(client):
    return client.get('/api/literature/measurements').json()['items']


def run(client, inputs):
    return client.post('/api/digital-twin/run', json={'inputs': inputs})


def test_every_core_observation_preserves_exact_evidence_and_qualifiers(client, monkeypatch):
    items = observations(client)
    assert len(items) == 119
    inference = Mock(side_effect=AssertionError('Evidence must precede inference'))
    monkeypatch.setattr(client.app.state.scientific, 'infer', inference)
    for item in items:
        response = run(client, item['inputs'])
        assert response.status_code == 200
        result = response.json()
        assert result['status'] == 'literature'
        assert item in result['items']
        assert 'prediction' not in result
    assert {'reported', 'approximately', 'greater_than'} <= {i['value_qualifier'] for i in items}
    assert next(i for i in items if i['measurement_id'] == 'M-0082')['hydrogen_capacity_wt_pct'] == 4.21
    inference.assert_not_called()


def test_exact_requires_sample_identity_and_matching_conditions(client):
    item = observations(client)[2]
    for change in ({'sample_id': None}, {'temperature_c': item['inputs']['temperature_c'] + 0.000001},
                   {'pressure_relation': '<'}, {'pressure_bar': None, 'pressure_relation': None},
                   {'catalyst_components': 'Ni|Co'}, {'preparation_method': None}):
        result = run(client, {**item['inputs'], **change})
        assert result.status_code == 200
        assert result.json()['status'] != 'literature'


def test_reported_temperature_is_not_a_numeric_match(client):
    item = next(i for i in observations(client) if i['inputs']['temperature_c'] is None)
    assert run(client, item['inputs']).json()['status'] == 'literature'
    result = run(client, {**item['inputs'], 'temperature_c': 25, 'temperature_reported': None}).json()
    assert result['status'] == 'unavailable'
    assert result['prediction'] is None


def test_duplicate_evidence_is_returned_separately(client):
    index = client.app.state.scientific.literature
    item = index.items[2]
    duplicate = item.model_copy(update={'measurement_id': 'TEST-REPEAT'})
    index.items.append(duplicate)
    result = run(client, item.inputs.model_dump()).json()
    assert [i['measurement_id'] for i in result['items']] == [item.measurement_id, 'TEST-REPEAT']


def test_supported_prediction_interval_and_single_model_parity(client):
    inputs = defaults(client)
    result = run(client, inputs).json()
    standalone = predict_capacity(model_payload(ScientificInputs(**inputs)))
    assert result['status'] == 'predicted'
    assert result['prediction'] == standalone['prediction']
    assert result['model_id'] == 'h2-triad-capacity-v1'
    assert len(result['prediction']['empirical_interval_90_wt_pct']) == 2
    assert result['support']['warnings'] == standalone['support']['warnings']


@pytest.mark.parametrize('change,reason', [
    ({'temperature_c': 999}, 'temperature_c_outside_absorption_range'),
    ({'duration_seconds': -1}, 'negative_duration_seconds'),
    ({'pressure_bar': 1}, 'pressure_bar_outside_absorption_range'),
    ({'catalyst_family': 'unseen'}, 'unseen_catalyst_family'),
    ({'catalyst_elements': 'Xe'}, 'catalyst_elements_entirely_unseen'),
    ({'catalyst_components': ''}, 'missing_catalyst_components'),
    ({'catalyst_loading_wt_pct': None}, 'unsupported_missing_catalyst_loading_wt_pct'),
])
def test_unsupported_has_no_capacity(client, change, reason):
    result = run(client, {**defaults(client), **change})
    assert result.status_code == 200
    body = result.json()
    assert body['status'] == 'unavailable' and body['prediction'] is None
    assert reason in body['support']['reasons']


@pytest.mark.parametrize('change,warning', [
    ({'pressure_bar': None, 'pressure_relation': None}, 'pressure_bar_missing'),
    ({'catalyst_elements': 'Ni|Xe'}, 'some_catalyst_elements_unseen'),
    ({'support_material': 'unseen support'}, 'unseen_support_material'),
    ({'preparation_method': 'unseen method'}, 'unseen_preparation_method'),
])
def test_support_warnings_survive(client, change, warning):
    body = run(client, {**defaults(client), **change}).json()
    assert body['status'] == 'predicted'
    assert warning in body['support']['warnings']


@pytest.mark.parametrize('change', [
    {'temperature_c': '250'}, {'temperature_c': True}, {'temperature_c': None},
    {'duration_seconds': []}, {'catalyst_components': ['Ni']}, {'catalyst_elements': 12},
    {'support_material': {}}, {'base_material': 'NaAlH4'}, {'extra': 1},
    {'sample_id': 'unknown'}, {'pressure_bar': None}, {'pressure_relation': None},
])
def test_malformed_requests_fail_before_inference(client, monkeypatch, change):
    inference = Mock(side_effect=AssertionError('Malformed input reached inference'))
    monkeypatch.setattr(client.app.state.scientific, 'infer', inference)
    assert run(client, {**defaults(client), **change}).status_code == 422
    inference.assert_not_called()


def test_invalid_json_and_extra_body_are_safe(client):
    inputs = defaults(client)
    for body in ({}, {'inputs': {}}, {'inputs': inputs, 'extra': 1}):
        assert client.post('/api/digital-twin/run', json=body).status_code == 422
    for body in ('{"inputs":', json.dumps({'inputs': {**inputs, 'temperature_c': float('nan')}})):
        response = client.post('/api/digital-twin/run', content=body, headers={'Content-Type': 'application/json'})
        assert response.status_code == 422
        assert all('input' not in error and 'ctx' not in error for error in response.json()['detail'])


def test_landscape_is_one_batch_and_selected_point_is_exact(client, monkeypatch):
    instance = client.app.state.scientific
    batch = Mock(wraps=instance.predictor.predict_many)
    monkeypatch.setattr(instance.predictor, 'predict_many', batch)
    inputs = defaults(client)
    body = client.post('/api/digital-twin/landscape', json={'inputs': inputs}).json()
    assert body['total_cells'] == body['supported_cells'] == 400
    assert len(body['z']) == 20 and all(len(row) == 20 for row in body['z'])
    assert batch.call_count == 1 and len(batch.call_args.args[0]) == 401
    assert body['selected']['prediction'] == run(client, inputs).json()['prediction']
    assert body['x'][0] == 50 and body['x'][-1] == 299.85
    assert body['y'][0] == 0 and body['y'][-1] == 15
    node = {**inputs, 'temperature_c': body['x'][7], 'catalyst_loading_wt_pct': body['y'][4]}
    result = run(client, node).json()
    assert body['z'][4][7] == result['prediction']['hydrogen_capacity_wt_pct']
    assert body['intervals'][4][7] == result['prediction']['empirical_interval_90_wt_pct']


def test_masked_landscape_cells_never_get_predictions(client):
    inputs = defaults(client)
    response = client.post('/api/digital-twin/landscape', json={
        'inputs': inputs, 'x_range': [40, 60], 'x_points': 3, 'y_points': 2,
    })
    assert response.status_code == 200
    body = response.json()
    assert body['supported_cells'] == 4
    assert body['supported'] == [[False, True, True], [False, True, True]]
    assert all(row[0] is None for row in body['z'])
    assert all(row[0] is None for row in body['intervals'])
    assert body['reasons'][0][0] == ['temperature_c_outside_absorption_range']
    body = client.post('/api/digital-twin/landscape', json={'inputs': {**inputs, 'duration_seconds': 1}}).json()
    assert body['supported_cells'] == 0
    assert all(value is None for row in body['z'] for value in row)


@pytest.mark.parametrize('change', [
    {'x_points': 1}, {'x_points': 41}, {'y_points': 100000}, {'x_points': True},
    {'x_points': '20'}, {'x_variable': 'pressure_bar'}, {'y_variable': 'temperature_c'},
    {'x_range': [100, 50]}, {'x_range': [-1, 10]}, {'x_range': [0, 10001]},
])
def test_landscape_grid_validation(client, change):
    assert client.post('/api/digital-twin/landscape', json={'inputs': defaults(client), **change}).status_code == 422


def test_cached_initialization_and_service_failures(tmp_path, monkeypatch):
    import model.predict as inference
    loader = Mock(wraps=inference.load_bundle)
    monkeypatch.setattr(inference, 'load_bundle', loader)
    with TestClient(create_app(tmp_path / 'app.db')) as client:
        assert loader.call_count == 1
        inputs = defaults(client)
        run(client, inputs)
        client.post('/api/digital-twin/landscape', json={'inputs': inputs})
        assert loader.call_count == 1
        assert client.get('/api/scientific/readiness').status_code == 200
        instance = client.app.state.scientific
        instance.predictor = None
        assert run(client, observations(client)[0]['inputs']).json()['status'] == 'literature'
        assert run(client, inputs).status_code == 503
        assert client.get('/api/scientific/readiness').status_code == 503
        instance.literature = None
        assert run(client, inputs).status_code == 503


def test_bad_artifacts_and_metadata_fail_closed(tmp_path):
    assert ScientificService(artifacts=tmp_path).predictor is None
    for path in ARTIFACTS.iterdir():
        (tmp_path / path.name).write_bytes(path.read_bytes())
    metadata_path = tmp_path / 'model_metadata.json'
    metadata = json.loads(metadata_path.read_text())
    metadata['dataset_sha256'] = 'wrong'
    metadata_path.write_text(json.dumps(metadata))
    instance = ScientificService(artifacts=tmp_path)
    assert instance.predictor is None and instance.literature is not None
    (tmp_path / 'capacity_model.joblib').write_bytes(b'corrupt')
    assert ScientificService(artifacts=tmp_path).predictor is None


def test_empty_demo_database_does_not_disable_science(tmp_path):
    with TestClient(create_app(tmp_path / 'empty.db', seed_demo=False)) as client:
        assert client.get('/api/experiments').json() == {'items': []}
        assert run(client, defaults(client)).json()['status'] == 'predicted'


def test_desorption_missing_loading_and_interval_absence_are_preserved(client):
    inputs = {**defaults(client), 'measurement_mode': 'desorption', 'temperature_c': 300,
              'duration_seconds': 600, 'pressure_bar': None, 'pressure_relation': None,
              'catalyst_loading_wt_pct': None}
    result = run(client, inputs).json()
    assert result['status'] == 'predicted'
    assert {'pressure_bar_missing', 'catalyst_loading_wt_pct_missing'} <= set(result['support']['warnings'])
    client.app.state.scientific.predictor.bundle.interval_quantiles = None
    result = run(client, inputs).json()
    assert result['prediction']['empirical_interval_90_wt_pct'] is None


def test_inference_exception_is_retryable_and_does_not_leak(client, monkeypatch):
    monkeypatch.setattr(client.app.state.scientific.predictor, 'predict_many', Mock(side_effect=RuntimeError('private artifact detail')))
    response = run(client, defaults(client))
    assert response.status_code == 503
    assert 'private artifact detail' not in response.text


def test_grid_accepts_maximum_size_and_keeps_support_warnings(client):
    inputs = {**defaults(client), 'pressure_bar': None, 'pressure_relation': None}
    response = client.post('/api/digital-twin/landscape', json={'inputs': inputs, 'x_points': 40, 'y_points': 40})
    assert response.status_code == 200
    result = response.json()
    assert result['total_cells'] == result['supported_cells'] == 1600
    assert all('pressure_bar_missing' in warnings for row in result['warnings'] for warnings in row)
