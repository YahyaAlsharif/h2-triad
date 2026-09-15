import { request } from './dashboardService'

const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const number = (v) => typeof v === 'number' && Number.isFinite(v)
const nullableNumber = (v) => v === null || number(v)
const strings = (v) =>
  Array.isArray(v) && v.every((item) => typeof item === 'string')
const inputKeys = [
  'base_material',
  'sample_id',
  'measurement_mode',
  'temperature_c',
  'temperature_reported',
  'duration_seconds',
  'catalyst_loading_wt_pct',
  'catalyst_family',
  'catalyst_elements',
  'catalyst_components',
  'support_material',
  'pressure_bar',
  'pressure_relation',
  'preparation_method',
]
export function requireShape(valid) {
  if (!valid)
    throw new Error(
      'The API returned an invalid scientific response. Please retry.',
    )
}
export function inputsMatch(a, b) {
  return !!a && !!b && inputKeys.every((key) => a[key] === b[key])
}
function validateInputs(v) {
  requireShape(
    object(v) &&
      v.base_material === 'MgH2' &&
      [
        'measurement_mode',
        'catalyst_family',
        'catalyst_elements',
        'catalyst_components',
      ].every((key) => typeof v[key] === 'string') &&
      number(v.duration_seconds) &&
      ['temperature_c', 'catalyst_loading_wt_pct', 'pressure_bar'].every(
        (key) => nullableNumber(v[key]),
      ) &&
      [
        'sample_id',
        'temperature_reported',
        'support_material',
        'pressure_relation',
        'preparation_method',
      ].every((key) => v[key] === null || typeof v[key] === 'string'),
  )
}
function validatePrediction(v) {
  requireShape(object(v) && number(v.hydrogen_capacity_wt_pct))
  if (v.empirical_interval_90_wt_pct != null) {
    const interval = v.empirical_interval_90_wt_pct
    requireShape(
      Array.isArray(interval) &&
        interval.length === 2 &&
        interval.every(number) &&
        interval[0] <= interval[1],
    )
  }
}
function validateObservation(item) {
  requireShape(
    object(item) &&
      typeof item.measurement_id === 'string' &&
      typeof item.sample_label === 'string',
  )
  validateInputs(item.inputs)
  requireShape(
    [
      'hydrogen_capacity_wt_pct',
      'capacity_lower_wt_pct',
      'capacity_upper_wt_pct',
      'reported_uncertainty_wt_pct',
    ].every((key) => nullableNumber(item[key])) &&
      [
        'value_qualifier',
        'capacity_basis',
        'temperature_raw',
        'pressure_raw',
        'duration_raw',
        'sample_note',
      ].every((key) => typeof item[key] === 'string') &&
      object(item.source) &&
      [
        'source_id',
        'paper_id',
        'title',
        'doi',
        'year',
        'source_pdf_page',
        'source_locator',
        'extraction_type',
        'extraction_note',
      ].every((key) => typeof item.source[key] === 'string') &&
      object(item.preparation),
  )
}
export function validateRun(body, inputs) {
  requireShape(object(body))
  validateInputs(body.inputs)
  requireShape(inputsMatch(body.inputs, inputs))
  if (body.status === 'literature') {
    requireShape(Array.isArray(body.items) && body.items.length > 0)
    body.items.forEach((item) => {
      validateObservation(item)
      requireShape(
        inputsMatch(item.inputs, inputs) && inputs.sample_id !== null,
      )
    })
  } else {
    requireShape(
      object(body.support) &&
        strings(body.support.warnings) &&
        strings(body.support.reasons),
    )
    if (body.status === 'predicted') {
      requireShape(
        body.support.supported === true && typeof body.model_id === 'string',
      )
      validatePrediction(body.prediction)
    } else {
      requireShape(
        body.status === 'unavailable' &&
          body.support.supported === false &&
          body.prediction === null &&
          typeof body.reason === 'string',
      )
      requireShape(
        Object.keys(body).every((key) =>
          ['status', 'inputs', 'reason', 'prediction', 'support'].includes(key),
        ),
      )
    }
  }
  return body
}
export async function getScientificOptions(options) {
  const body = await request('/api/digital-twin/options', options)
  requireShape(
    object(body) &&
      object(body.support_profile) &&
      object(body.model) &&
      object(body.landscape),
  )
  validateInputs(body.default_inputs)
  const profile = body.support_profile
  requireShape(
    number(body.model.uncertainty_evaluation?.coverage) &&
      body.model.uncertainty_evaluation.coverage >= 0 &&
      body.model.uncertainty_evaluation.coverage <= 1,
  )
  requireShape(
    typeof body.model.model_id === 'string' &&
      body.model.model_id === profile.model_id,
  )
  for (const key of [
    'catalyst_families',
    'known_elements',
    'support_materials',
  ])
    requireShape(strings(profile[key]))
  for (const mode of ['absorption', 'desorption']) {
    requireShape(object(profile.measurement_modes?.[mode]?.ranges))
    for (const key of [
      'temperature_c',
      'duration_seconds',
      'pressure_bar',
      'catalyst_loading_wt_pct',
    ]) {
      const rule = profile.measurement_modes[mode].ranges[key]
      requireShape(
        object(rule) &&
          number(rule.min) &&
          number(rule.max) &&
          rule.min <= rule.max &&
          typeof rule.missing_allowed === 'boolean',
      )
    }
  }
  return body
}
export async function getLiterature(options) {
  const body = await request('/api/literature/measurements', options)
  requireShape(object(body) && Array.isArray(body.items))
  body.items.forEach(validateObservation)
  requireShape(
    new Set(body.items.map((item) => item.measurement_id)).size ===
      body.items.length,
  )
  return body
}
export async function runDigitalTwin(inputs, options) {
  return validateRun(
    await request('/api/digital-twin/run', {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs }),
    }),
    inputs,
  )
}
export async function getLandscape(inputs, options) {
  const body = await request('/api/digital-twin/landscape', {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs,
      x_variable: 'temperature_c',
      y_variable: 'catalyst_loading_wt_pct',
      x_points: 20,
      y_points: 20,
    }),
  })
  requireShape(
    object(body) &&
      inputsMatch(body.inputs, inputs) &&
      body.x_variable === 'temperature_c' &&
      body.y_variable === 'catalyst_loading_wt_pct' &&
      typeof body.model_id === 'string',
  )
  requireShape(
    [body.x, body.y].every(
      (axis) =>
        Array.isArray(axis) &&
        axis.length >= 2 &&
        axis.length <= 40 &&
        axis.every(number) &&
        axis.every((v, i) => i === 0 || v > axis[i - 1]),
    ),
  )
  for (const key of ['z', 'intervals', 'supported', 'reasons', 'warnings']) {
    requireShape(
      Array.isArray(body[key]) &&
        body[key].length === body.y.length &&
        body[key].every(
          (row) => Array.isArray(row) && row.length === body.x.length,
        ),
    )
  }
  let count = 0
  body.z.forEach((row, j) =>
    row.forEach((z, i) => {
      const supported = body.supported[j][i]
      requireShape(
        typeof supported === 'boolean' &&
          strings(body.reasons[j][i]) &&
          strings(body.warnings[j][i]),
      )
      if (supported) {
        validatePrediction({
          hydrogen_capacity_wt_pct: z,
          empirical_interval_90_wt_pct: body.intervals[j][i],
        })
        count++
      } else
        requireShape(
          z === null &&
            body.intervals[j][i] === null &&
            body.reasons[j][i].length > 0,
        )
    }),
  )
  requireShape(
    body.supported_cells === count &&
      body.total_cells === body.x.length * body.y.length,
  )
  validateRun(body.selected, inputs)
  requireShape(body.selected.status !== 'literature')
  requireShape(
    body.selected.status !== 'predicted' ||
      body.selected.model_id === body.model_id,
  )
  return body
}
