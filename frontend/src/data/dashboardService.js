// HTTP boundary: validate complete records before they reach component state.
export const inputKeys = [
  'material',
  'additive',
  'concentration_wt_pct',
  'preparation_method',
  'milling_hours',
  'particle_size_nm',
  'temperature_c',
  'pressure_bar',
]
const textKeys = ['material', 'additive', 'preparation_method']
const numericKeys = inputKeys.filter((key) => !textKeys.includes(key))
const object = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value) => typeof value === 'string' && value.trim().length > 0
const number = (value) => typeof value === 'number' && Number.isFinite(value)
function requireShape(condition) {
  if (!condition)
    throw new Error('The API returned an invalid response. Please retry.')
}
function validateInputs(value) {
  requireShape(
    object(value) &&
      textKeys.every((key) => text(value[key])) &&
      numericKeys.every((key) => number(value[key])),
  )
}
export function inputsMatch(a, b) {
  return inputKeys.every((key) => a[key] === b[key])
}
function validateExperiment(record) {
  requireShape(
    object(record) &&
      typeof record.id === 'string' &&
      /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(record.id),
  )
  validateInputs(record.inputs)
  requireShape(
    number(record.hydrogen_capacity_wt_pct) &&
      record.hydrogen_capacity_wt_pct >= 0 &&
      record.hydrogen_capacity_wt_pct <= 100 &&
      ['Promising', 'Moderate', 'Limited'].includes(record.outcome),
  )
  requireShape(
    object(record.measurement) &&
      text(record.measurement.mode) &&
      number(record.measurement.duration_minutes) &&
      record.measurement.duration_minutes >= 0 &&
      text(record.measurement.capacity_basis),
  )
  requireShape(
    object(record.source) &&
      ['kind', 'label', 'reference'].every((key) => text(record.source[key])) &&
      typeof record.source.is_demo === 'boolean' &&
      (record.source.kind !== 'synthetic_demo' || record.source.is_demo),
  )
}
function validateItems(items) {
  requireShape(Array.isArray(items))
  items.forEach(validateExperiment)
  requireShape(new Set(items.map((item) => item.id)).size === items.length)
}
async function request(path, { signal, ...options } = {}) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = setTimeout(abort, 10000)
  try {
    const response = await fetch(path, {
      ...options,
      signal: controller.signal,
    })
    if (!response.ok) {
      let message = 'The API is unavailable. Please retry.'
      if (response.status === 422) {
        const body = await response.json().catch(() => null)
        message =
          typeof body?.detail === 'string'
            ? body.detail
            : 'Check the configuration values and try again.'
      }
      throw new Error(message)
    }
    return await response.json()
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (error.name === 'AbortError')
      throw new Error('The API request timed out. Please retry.', {
        cause: error,
      })
    if (error instanceof SyntaxError)
      throw new Error('The API returned invalid JSON. Please retry.', {
        cause: error,
      })
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
export async function getExperiments(options) {
  const body = await request('/api/experiments', options)
  requireShape(object(body))
  validateItems(body.items)
  return body
}
export async function getExperiment(id, options) {
  const body = await request(
    '/api/experiments/' + encodeURIComponent(id),
    options,
  )
  validateExperiment(body)
  requireShape(body.id === id)
  return body
}
export async function getDomainOptions(options) {
  const body = await request('/api/domain/options', options)
  requireShape(
    object(body) &&
      Array.isArray(body.materials) &&
      body.materials.every(text) &&
      new Set(body.materials).size === body.materials.length,
  )
  for (const [key, flag] of [
    ['additives', 'allows_loading'],
    ['methods', 'allows_milling'],
  ]) {
    requireShape(
      Array.isArray(body[key]) &&
        body[key].every(
          (item) =>
            object(item) && text(item.value) && typeof item[flag] === 'boolean',
        ),
    )
    requireShape(
      new Set(body[key].map((item) => item.value)).size === body[key].length,
    )
  }
  requireShape(object(body.numeric_constraints))
  for (const key of numericKeys) {
    const limit = body.numeric_constraints[key]
    requireShape(
      object(limit) &&
        number(limit.min) &&
        number(limit.max) &&
        number(limit.step) &&
        limit.min <= limit.max &&
        limit.step > 0,
    )
  }
  if (body.default_inputs !== null) {
    validateInputs(body.default_inputs)
    requireShape(
      body.materials.includes(body.default_inputs.material) &&
        body.additives.some(
          (item) => item.value === body.default_inputs.additive,
        ) &&
        body.methods.some(
          (item) => item.value === body.default_inputs.preparation_method,
        ),
    )
    for (const key of numericKeys) {
      const limit = body.numeric_constraints[key]
      requireShape(
        body.default_inputs[key] >= limit.min &&
          body.default_inputs[key] <= limit.max,
      )
    }
  } else {
    requireShape(
      !body.materials.length && !body.additives.length && !body.methods.length,
    )
  }
  return body
}
export async function runDigitalTwin(inputs, options) {
  const body = await request('/api/digital-twin/run', {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs }),
  })
  requireShape(object(body))
  validateInputs(body.inputs)
  requireShape(inputsMatch(inputs, body.inputs))
  validateItems(body.items)
  if (body.status === 'matched') {
    requireShape(
      body.match_method === 'exact' &&
        body.items.length > 0 &&
        body.items.every((item) => inputsMatch(item.inputs, inputs)),
    )
  } else {
    requireShape(
      body.status === 'unavailable' &&
        body.reason === 'no_exact_match' &&
        body.items.length === 0,
    )
    requireShape(
      Object.keys(body).every((key) =>
        ['status', 'reason', 'inputs', 'items'].includes(key),
      ),
    )
  }
  return body
}
export async function getHealth(options) {
  const body = await request('/api/health', options)
  requireShape(
    object(body) &&
      body.status === 'ok' &&
      body.api === 'connected' &&
      body.database === 'connected',
  )
  return body
}
