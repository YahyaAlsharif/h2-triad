import {
  mockExperiments,
  mockPredictionFixtures,
  inputKeys,
  mockChartCohort,
} from './mockExperiments'

// Replace this adapter with fetch calls in Phase 3. No domain API is called here.
function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted)
      return reject(new DOMException('Aborted', 'AbortError'))
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
export function inputsMatch(a, b) {
  return inputKeys.every((key) => a[key] === b[key])
}
export async function getExperiments({ signal } = {}) {
  await delay(450, signal)
  return {
    items: structuredClone(mockExperiments),
    chart_cohort: structuredClone(mockChartCohort),
    source: 'mock',
  }
}
export async function runDigitalTwin(inputs, { signal } = {}) {
  await delay(850, signal)
  const fixture = mockPredictionFixtures.find((item) =>
    inputsMatch(item.inputs, inputs),
  )
  // Exact fixture lookup only: never extrapolate or calculate chemical performance.
  return fixture
    ? { status: 'complete', ...structuredClone(fixture) }
    : { status: 'unavailable', inputs: { ...inputs }, source: { kind: 'mock' } }
}
