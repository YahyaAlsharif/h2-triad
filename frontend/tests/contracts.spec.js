import { test, expect } from '@playwright/test'
import { deriveCohorts } from '../src/data/analysis.js'
import {
  getExperiments,
  getExperiment,
  getDomainOptions,
  getHealth,
} from '../src/data/dashboardService.js'

async function withResponse(body, action) {
  const original = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => structuredClone(body),
  })
  try {
    return await action()
  } finally {
    globalThis.fetch = original
  }
}

test('legacy demo options and health still reject corrupt responses', async ({
  request,
}) => {
  const options = await (await request.get('/api/domain/options')).json()
  await expect(withResponse(options, getDomainOptions)).resolves.toEqual(
    options,
  )
  const broken = structuredClone(options)
  broken.default_inputs.material = 'Not an option'
  await expect(withResponse(broken, getDomainOptions)).rejects.toThrow(
    'invalid response',
  )
  await expect(
    withResponse({ api: 'connected', database: 'connected' }, getHealth),
  ).rejects.toThrow('invalid response')
})

test('cohort compatibility ignores provenance but preserves every observation', async ({
  request,
}) => {
  const { items } = await (await request.get('/api/experiments')).json()
  const first = items[0]
  const otherSource = {
    ...structuredClone(first),
    id: 'TEST-REPEAT',
    source: { ...first.source, reference: 'Different source (test only)' },
  }
  const differentDuration = {
    ...structuredClone(first),
    id: 'TEST-DURATION',
    measurement: { ...first.measurement, duration_minutes: 30 },
  }
  const cohorts = deriveCohorts([first, otherSource, differentDuration])
  expect(cohorts).toHaveLength(2)
  expect(cohorts[0].items.map((item) => item.id)).toEqual([
    first.id,
    otherSource.id,
  ])
  expect(cohorts[0].items[1].source.reference).toBe(
    otherSource.source.reference,
  )
  for (const key of [
    'material',
    'concentration_wt_pct',
    'pressure_bar',
    'preparation_method',
    'milling_hours',
    'particle_size_nm',
  ]) {
    const alternative = items.find(
      (record) => record.inputs[key] !== first.inputs[key],
    )
    const changed = {
      ...first,
      inputs: { ...first.inputs, [key]: alternative.inputs[key] },
    }
    expect(deriveCohorts([first, changed])).toHaveLength(2)
  }
  for (const key of ['mode', 'capacity_basis']) {
    const changed = {
      ...first,
      measurement: {
        ...first.measurement,
        [key]: 'Different metadata (test only)',
      },
    }
    expect(deriveCohorts([first, changed])).toHaveLength(2)
  }
})

test('API boundary rejects corrupt records, duplicate IDs, and malformed JSON', async ({
  request,
}) => {
  const body = await (await request.get('/api/experiments')).json()
  await expect(withResponse(body, getExperiments)).resolves.toEqual(body)
  await expect(
    withResponse(body.items[0], () => getExperiment(body.items[0].id)),
  ).resolves.toEqual(body.items[0])
  await expect(
    withResponse(body.items[0], () => getExperiment('WRONG-ID')),
  ).rejects.toThrow('invalid response')
  const mutations = [
    (b) => {
      b.items.push(b.items[0])
    },
    (b) => {
      b.items[0].inputs.temperature_c = '300'
    },
    (b) => {
      b.items[0].hydrogen_capacity_wt_pct = NaN
    },
    (b) => {
      delete b.items[0].measurement.capacity_basis
    },
    (b) => {
      b.items[0].source.is_demo = false
    },
    (b) => {
      b.items[0].source.reference = ''
    },
  ]
  for (const mutate of mutations) {
    const invalid = structuredClone(body)
    mutate(invalid)
    await expect(withResponse(invalid, getExperiments)).rejects.toThrow(
      'invalid response',
    )
  }
  const original = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => {
      throw new SyntaxError('Invalid JSON')
    },
  })
  try {
    await expect(getExperiments()).rejects.toThrow('invalid JSON')
  } finally {
    globalThis.fetch = original
  }
})

test('duplicate demo observations from different sources remain visible in chart', async ({
  page,
  request,
}) => {
  const { items } = await (await request.get('/api/experiments')).json()
  const original = items.find((item) => item.id === 'EXP-003')
  const repeat = {
    ...structuredClone(original),
    id: 'TEST-REPEAT',
    source: { ...original.source, reference: 'Another source (test only)' },
  }
  await page.route('**/api/experiments', (route) =>
    route.fulfill({ json: { items: [...items, repeat] } }),
  )
  await page.goto('/')
  await expect(page.getByText('13 of 13 experiments')).toBeVisible()
  await expect(
    page.getByLabel('Compatible conditions').locator('option'),
  ).toHaveCount(4)
  await page.getByText('View chart data', { exact: true }).click()
  await expect(page.locator('.chart-data tbody tr')).toHaveCount(10)
  await expect(page.locator('.chart-data')).toContainText(
    'Another source (test only)',
  )
})
