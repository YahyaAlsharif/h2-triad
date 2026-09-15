import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  getLandscape,
  getScientificOptions,
  getLiterature,
  runDigitalTwin,
  validateRun,
} from '../src/data/scientificService.js'
import { literatureValue } from '../src/data/scientificPresentation.js'

async function open(page) {
  await page.goto('/')
  await expect(page.getByLabel('Measurement mode')).toBeVisible()
}
async function loadObservation(page, id) {
  const summary = page.getByText('Load a literature configuration', {
    exact: true,
  })
  if (!(await page.locator('.literature-loader').getAttribute('open'))) {
    if (!(await page.locator('.literature-loader').evaluate((el) => el.open)))
      await summary.click()
  }
  await page
    .getByRole('combobox', { name: 'Literature observation', exact: true })
    .selectOption(id)
  await page
    .getByRole('button', { name: 'Load configuration', exact: true })
    .click()
}
async function run(page) {
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
}
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

test('custom prediction, interval, warnings, stale inputs and unsupported result', async ({
  page,
}) => {
  await open(page)
  await expect(page.locator('.literature-loader')).not.toHaveAttribute('open')
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  await page.route('**/api/digital-twin/run', async (route) => {
    await gate
    await route.continue()
  })
  await run(page)
  await expect(
    page.getByText('Checking literature and model support'),
  ).toBeVisible()
  await expect(page.getByLabel('Measurement mode')).toBeDisabled()
  release()
  await expect(page.locator('.capacity-result')).toContainText('AI prediction')
  await expect(page.locator('.uncertainty')).toContainText(
    'Empirical 90% interval',
  )
  await page.getByLabel('Hydrogen pressure (bar)').fill('')
  await expect(
    page.getByText('Inputs changed. Run again to update this result.'),
  ).toBeVisible()
  await run(page)
  await expect(page.locator('.twin-result')).toContainText(
    'Pressure is unspecified',
  )
  await page.getByLabel('Temperature (°C)').fill('999')
  await run(page)
  await expect(
    page.getByText('Prediction unavailable', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.capacity-result')).toHaveCount(0)
  await expect(page.locator('.twin-result')).toContainText(
    'temperature c outside absorption range',
  )
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await page.getByLabel('Duration (s)').fill('')
  await run(page)
  await expect(page.getByLabel('Duration (s)')).toBeFocused()
})

test('literature loader retains exact, approximate, threshold and reported-temperature evidence', async ({
  page,
  request,
}) => {
  const { items } = await (
    await request.get('/api/literature/measurements')
  ).json()
  await open(page)
  for (const id of [
    'M-0003',
    items.find((i) => i.value_qualifier === 'approximately').measurement_id,
    'M-0082',
    'M-0051',
  ]) {
    const item = items.find((i) => i.measurement_id === id)
    await loadObservation(page, id)
    await run(page)
    await expect(page.locator('.science-tag')).toHaveText(
      'Literature measurement',
    )
    await expect(page.locator('.literature-observation').first()).toContainText(
      literatureValue(item),
    )
    await expect(page.locator('.literature-observation').first()).toContainText(
      item.source.title,
    )
    await expect(page.locator('.literature-observation').first()).toContainText(
      item.source.source_locator,
    )
  }
  await expect(
    page.getByRole('button', { name: 'Generate landscape' }),
  ).toBeDisabled()
  await page.getByLabel('Temperature (°C)').fill('100')
  await run(page)
  await expect(page.locator('.science-tag')).not.toHaveText(
    'Literature measurement',
  )
  await loadObservation(page, 'M-0003')
  await page.getByLabel('Catalyst components', { exact: false }).fill('Ni|Co')
  await run(page)
  await expect(page.locator('.science-tag')).toHaveText('AI prediction')
  expect(
    literatureValue({
      value_qualifier: 'less_than',
      hydrogen_capacity_wt_pct: 4,
    }),
  ).toBe('< 4')
})

test('landscape loads lazily in one request and retains grid, marker, table and camera control', async ({
  page,
}) => {
  const plotRequests = []
  const errors = []
  page.on('request', (r) => {
    if (r.url().includes('PlotSurface')) plotRequests.push(r.url())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await open(page)
  expect(plotRequests).toHaveLength(0)
  let count = 0
  await page.route('**/api/digital-twin/landscape', (route) => {
    count++
    return route.continue()
  })
  await page.getByRole('button', { name: 'Generate landscape' }).click()
  await expect(page.locator('.prediction-surface')).toBeVisible()
  await expect
    .poll(() =>
      page.locator('.prediction-surface').evaluate((el) => el.data?.length),
    )
    .toBe(2)
  expect(count).toBe(1)
  const plot = await page.locator('.prediction-surface').evaluate((el) => ({
    types: el.data.map((trace) => trace.type),
    gaps: el.data[0].connectgaps,
    selectedX: el.data[1].x[0],
    camera: el.layout.scene.camera,
  }))
  expect(plot.types).toEqual(['surface', 'scatter3d'])
  expect(plot.gaps).toBe(false)
  await expect(page.locator('.landscape-panel')).toContainText(
    '400 of 400 cells supported',
  )
  await page.getByRole('button', { name: 'Reset view', exact: true }).focus()
  await page.keyboard.press('Enter')
  await page.getByText('View landscape data', { exact: true }).click()
  await expect(page.locator('.landscape-data tbody tr')).toHaveCount(400)
  await page.getByLabel('Duration (s)').fill('600')
  await expect(
    page.getByText('Inputs changed. Update the landscape', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Update landscape' }).click()
  await expect(
    page.getByText('Inputs changed. Update the landscape', { exact: false }),
  ).toHaveCount(0)
  expect(errors).toEqual([])
})

test('partial masks, all-unsupported grid and retry are honest', async ({
  page,
  request,
}) => {
  await open(page)
  const { default_inputs: inputs } = await (
    await request.get('/api/digital-twin/options')
  ).json()
  const masked = await (
    await request.post('/api/digital-twin/landscape', {
      data: { inputs, x_range: [40, 60], x_points: 3, y_points: 2 },
    })
  ).json()
  await page.route('**/api/digital-twin/landscape', (route) =>
    route.fulfill({ json: masked }),
  )
  await page.getByRole('button', { name: 'Generate landscape' }).click()
  await expect(page.locator('.landscape-panel')).toContainText(
    '4 of 6 cells supported · 2 masked',
  )
  await page.getByText('View landscape data', { exact: true }).click()
  await expect(page.locator('.landscape-data tbody')).toContainText(
    'Unavailable',
  )
  await page.unroute('**/api/digital-twin/landscape')
  await page.getByLabel('Duration (s)').fill('1')
  await page.getByRole('button', { name: 'Update landscape' }).click()
  await expect(
    page.getByText('No supported cells', { exact: false }),
  ).toBeVisible()
  await expect(page.locator('.prediction-surface')).toHaveCount(0)
  await page.route('**/api/digital-twin/landscape', (route) =>
    route.abort('failed'),
  )
  await page.getByRole('button', { name: 'Update landscape' }).click()
  await expect(
    page.getByText('Could not load the landscape.', { exact: false }),
  ).toBeVisible()
  await page.unroute('**/api/digital-twin/landscape')
  await page.getByLabel('Duration (s)').fill('600')
  await page.getByRole('button', { name: 'Retry landscape' }).click()
  await expect(page.locator('.prediction-surface')).toBeVisible()
})

test('scientific response boundary rejects corrupt results and landscape matrices', async ({
  request,
}) => {
  const options = await (await request.get('/api/digital-twin/options')).json()
  await expect(withResponse(options, getScientificOptions)).resolves.toEqual(
    options,
  )
  const inputs = options.default_inputs
  const result = await (
    await request.post('/api/digital-twin/run', { data: { inputs } })
  ).json()
  await expect(
    withResponse(result, () => runDigitalTwin(inputs)),
  ).resolves.toEqual(result)
  for (const mutate of [
    (b) => {
      b.prediction.hydrogen_capacity_wt_pct = '5'
    },
    (b) => {
      b.prediction.empirical_interval_90_wt_pct = [6, 2]
    },
    (b) => {
      b.support.warnings = null
    },
    (b) => {
      b.inputs.duration_seconds += 1
    },
  ]) {
    const invalid = structuredClone(result)
    mutate(invalid)
    expect(() => validateRun(invalid, inputs)).toThrow(
      'invalid scientific response',
    )
  }
  const landscape = await (
    await request.post('/api/digital-twin/landscape', { data: { inputs } })
  ).json()
  await expect(
    withResponse(landscape, () => getLandscape(inputs)),
  ).resolves.toEqual(landscape)
  for (const mutate of [
    (b) => {
      b.z[0].pop()
    },
    (b) => {
      b.z[0][0] = NaN
    },
    (b) => {
      b.supported[0][0] = false
    },
    (b) => {
      b.supported_cells = 0
    },
  ]) {
    const invalid = structuredClone(landscape)
    mutate(invalid)
    await expect(
      withResponse(invalid, () => getLandscape(inputs)),
    ).rejects.toThrow('invalid scientific response')
  }
  const literature = await (
    await request.get('/api/literature/measurements')
  ).json()
  await expect(withResponse(literature, getLiterature)).resolves.toEqual(
    literature,
  )
  literature.items.push(literature.items[0])
  await expect(withResponse(literature, getLiterature)).rejects.toThrow(
    'invalid scientific response',
  )
})

test('empty demo database leaves the scientific workspace available', async ({
  page,
}) => {
  await page.route('**/api/experiments', (route) =>
    route.fulfill({ json: { items: [] } }),
  )
  await open(page)
  await expect(page.getByText('No experiments available')).toBeVisible()
  await run(page)
  await expect(page.locator('.science-tag')).toHaveText('AI prediction')
})

test('literature loading failure retries without replacing custom inputs', async ({
  page,
}) => {
  await page.route('**/api/literature/measurements', (route) =>
    route.fulfill({ status: 503, json: {} }),
  )
  await open(page)
  await page.getByLabel('Duration (s)').fill('600')
  await page
    .getByText('Load a literature configuration', { exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Retry literature' }),
  ).toBeVisible()
  await page.unroute('**/api/literature/measurements')
  await page.getByRole('button', { name: 'Retry literature' }).click()
  await expect(
    page.getByRole('combobox', { name: 'Literature observation', exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Duration (s)')).toHaveValue('600')
})

test('delayed landscape response stays attached to its submitted inputs', async ({
  page,
}) => {
  await open(page)
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  await page.route('**/api/digital-twin/landscape', async (route) => {
    await gate
    await route.continue()
  })
  await page.getByRole('button', { name: 'Generate landscape' }).click()
  await expect(
    page.getByText('Validating and predicting the grid…'),
  ).toBeVisible()
  await page.getByLabel('Duration (s)').fill('600')
  release()
  await expect(
    page.getByText('Inputs changed. Update the landscape', { exact: false }),
  ).toBeVisible()
  await expect(page.locator('.landscape-context')).toContainText('12000 s')
})

test('graphics download failure preserves results and the accessible grid', async ({
  page,
}) => {
  await page.route(/PlotSurface/, (route) => route.abort('failed'))
  await open(page)
  await run(page)
  await page.getByRole('button', { name: 'Generate landscape' }).click()
  await expect(
    page.getByText('Could not load the 3D view.', { exact: false }),
  ).toBeVisible()
  await expect(page.locator('.science-tag')).toHaveText('AI prediction')
  await page.getByText('View landscape data', { exact: true }).click()
  await expect(page.locator('.landscape-data tbody tr')).toHaveCount(400)
  await page.unroute(/PlotSurface/)
  await page.getByRole('button', { name: 'Reload page', exact: true }).click()
  await expect(page.getByLabel('Measurement mode')).toBeVisible()
  await page.getByRole('button', { name: 'Generate landscape' }).click()
  await expect(page.locator('.prediction-surface')).toBeVisible()
})

test('graphics context failure keeps data available and can retry', async ({
  page,
}) => {
  await open(page)
  await page.getByRole('button', { name: 'Generate landscape' }).click()
  await expect
    .poll(() =>
      page.locator('.prediction-surface').evaluate((el) => el.data?.length),
    )
    .toBe(2)
  await page
    .locator('.prediction-surface')
    .evaluate((el) => el.emit('plotly_webglcontextlost'))
  await expect(
    page.getByText('The 3D graphics context was lost.', { exact: false }),
  ).toBeVisible()
  await page.getByText('View landscape data', { exact: true }).click()
  await expect(page.locator('.landscape-data tbody tr')).toHaveCount(400)
  await page.getByRole('button', { name: 'Retry 3D view' }).click()
  await expect(
    page.getByText('The 3D graphics context was lost.', { exact: false }),
  ).toHaveCount(0)
  await expect
    .poll(() =>
      page.locator('.prediction-surface').evaluate((el) => el.data?.length),
    )
    .toBe(2)
})

test('landscape is responsive, accessible and static in both themes', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  await run(page)
  await page.getByRole('button', { name: 'Generate landscape' }).click()
  await expect
    .poll(() =>
      page.locator('.prediction-surface').evaluate((el) => el.data?.length),
    )
    .toBe(2)
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const theme of ['light', 'dark']) {
      if ((await page.locator('html').getAttribute('data-theme')) !== theme)
        await page
          .getByRole('button', { name: `Switch to ${theme} mode` })
          .click()
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true)
      await expect
        .poll(() =>
          page
            .locator('.prediction-surface')
            .evaluate(
              (el) =>
                el.layout?.paper_bgcolor ===
                getComputedStyle(document.documentElement)
                  .getPropertyValue('--surface')
                  .trim(),
            ),
        )
        .toBe(true)
      await page.locator('.prediction-surface').scrollIntoViewIfNeeded()
      await page.screenshot({
        path: testInfo.outputPath(`landscape-${width}-${theme}.png`),
        animations: 'disabled',
      })
      if ([1440, 390].includes(width)) {
        const audit = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
        expect(audit.violations).toEqual([])
      }
    }
  }
  await page.getByRole('button', { name: 'Reset view' }).focus()
  await expect(page.getByRole('button', { name: 'Reset view' })).toBeFocused()
  await page.keyboard.press('Enter')
  expect(
    await page
      .locator('.prediction-surface')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
})
