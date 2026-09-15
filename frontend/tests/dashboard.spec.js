import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function openDashboard(page) {
  await page.goto('/')
  await expect(page.getByText('12 of 12 experiments')).toBeVisible()
  await expect(page.getByLabel('Measurement mode')).toBeVisible()
}

test('demo dataset search, filters, sorting and provenance', async ({
  page,
}) => {
  await openDashboard(page)
  await page.getByLabel('Search experiments').fill('EXP-011')
  await expect(page.getByText('1 of 12 experiments')).toBeVisible()
  await page.getByRole('button', { name: 'Show details for EXP-011' }).click()
  await expect(page.locator('.experiment-detail')).toContainText(
    'Synthetic demo fixture',
  )
  await expect(
    page.getByRole('button', { name: 'Use in Digital Twin' }),
  ).toHaveCount(0)
  await page.getByLabel('Search experiments').fill('not a material')
  await expect(page.getByText('No matching experiments')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.getByLabel('Filter by outcome').selectOption('Promising')
  await expect(page.getByText('6 of 12 experiments')).toBeVisible()
  await page.getByLabel('Sort experiments').selectOption('capacity')
  await expect(
    page.locator('.experiment-table tbody tr').first(),
  ).toContainText('EXP-006')
})

test('comparison enforces its limit and highlights mismatched conditions', async ({
  page,
}) => {
  await openDashboard(page)
  await expect(page.getByText('No experiments selected')).toBeVisible()
  for (const id of ['EXP-003', 'EXP-006', 'EXP-009'])
    await page.getByLabel('Compare ' + id, { exact: true }).check()
  await expect(
    page.getByLabel('Compare EXP-011', { exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', { name: 'Remove EXP-009 from comparison' })
    .click()
  await page.getByLabel('Compare EXP-011', { exact: true }).check()
  await expect(page.locator('.comparison-notice')).toContainText(
    'hydrogen pressure, milling time, particle size',
  )
  await page.getByText('Compare all conditions', { exact: true }).click()
  await expect(page.locator('.different-condition')).toHaveCount(4)
  for (const id of ['EXP-003', 'EXP-006', 'EXP-011'])
    await page
      .getByRole('button', { name: 'Remove ' + id + ' from comparison' })
      .click()
  await expect(page.getByText('No experiments selected')).toBeVisible()
})

test('chart supports tooltips, series selection and a text equivalent', async ({
  page,
}) => {
  await openDashboard(page)
  await page.locator('.capacity-chart').scrollIntoViewIfNeeded()
  await expect(page.locator('.recharts-scatter')).toHaveCount(3)
  await page.locator('.recharts-scatter-symbol').first().hover()
  await expect(page.locator('.chart-tooltip')).toBeVisible()
  await page.getByText('View chart data', { exact: true }).click()
  await expect(page.locator('.chart-data')).toContainText('6.4 wt%')
  for (const name of ['Ni', 'Fe–Ni / N-C', 'TiF₃'])
    await page.getByRole('button', { name, exact: true }).click()
  await expect(
    page.getByText('Select an additive to show its series.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Ni', exact: true }).click()
  await expect(page.locator('.recharts-scatter')).toHaveCount(1)
})

test('health errors and retry have accurate connection messaging', async ({
  page,
}) => {
  await page.route('**/api/health', (route) =>
    route.fulfill({
      status: 503,
      json: { api: 'connected', database: 'disconnected' },
    }),
  )
  await openDashboard(page)
  await page
    .getByText('Prediction service unavailable', { exact: true })
    .click()
  await expect(
    page.getByText(
      'Dataset loading and new scientific runs require the backend.',
      {
        exact: false,
      },
    ),
  ).toBeVisible()
  await page.unroute('**/api/health')
  await page.getByRole('button', { name: 'Check again' }).click()
  await expect(
    page.getByText('Prediction service ready', { exact: true }),
  ).toBeVisible()
})

test('keyboard, reduced motion, theme persistence and accessibility', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openDashboard(page)
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Skip to workspace' }),
  ).toBeFocused()
  expect(
    await page
      .getByRole('link', { name: 'Skip to workspace' })
      .evaluate((el) => getComputedStyle(el).outlineStyle),
  ).toBe('solid')
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
  await expect(page.locator('.capacity-result')).toBeVisible()
  expect(
    await page
      .locator('.result-content')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  }
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('responsive screenshots and overflow checks in both themes', async ({
  page,
}, testInfo) => {
  await openDashboard(page)
  for (const id of ['EXP-003', 'EXP-006', 'EXP-009'])
    await page.getByLabel('Compare ' + id, { exact: true }).check()
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
  await expect(page.locator('.capacity-result')).toBeVisible()
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const theme of ['light', 'dark']) {
      if ((await page.locator('html').getAttribute('data-theme')) !== theme) {
        await page
          .getByRole('button', { name: 'Switch to ' + theme + ' mode' })
          .click()
      }
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true)
      await page.screenshot({
        path: testInfo.outputPath(theme + '-' + width + '.png'),
        fullPage: true,
        animations: 'disabled',
      })
      if ([1440, 768, 390, 320].includes(width)) {
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: 'instant' }),
        )
        await page.screenshot({
          path: testInfo.outputPath(theme + '-' + width + '-viewport.png'),
          animations: 'disabled',
        })
      }
      if (width === 390) {
        for (const section of ['analysis', 'experiments']) {
          await page
            .locator('#' + section)
            .evaluate((el) => el.scrollIntoView({ behavior: 'instant' }))
          await page.screenshot({
            path: testInfo.outputPath(theme + '-390-' + section + '.png'),
            animations: 'disabled',
          })
        }
      }
    }
  }
  await page.getByRole('button', { name: 'Show details for EXP-003' }).click()
  await expect(
    page.getByRole('button', { name: 'Use in Digital Twin' }),
  ).toHaveCount(0)
  await page.getByText('Compare all conditions', { exact: true }).click()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('dataset and lookup HTTP failures recover through retry', async ({
  page,
}) => {
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  await page.route('**/api/experiments', async (route) => {
    await gate
    await route.fulfill({ status: 503, json: { detail: 'Unavailable' } })
  })
  await page.goto('/')
  await expect(
    page.getByText('Loading experiments…', { exact: true }),
  ).toBeVisible()
  release()
  await expect(
    page.getByText('Could not load the dataset.', { exact: false }),
  ).toBeVisible()
  await page.unroute('**/api/experiments')
  await page.getByRole('button', { name: 'Retry dataset' }).click()
  await expect(page.getByText('12 of 12 experiments')).toBeVisible()
  await page.route('**/api/digital-twin/run', (route) => route.abort('failed'))
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
  await expect(page.getByText('Could not retrieve a result')).toBeVisible()
  await page.unroute('**/api/digital-twin/run')
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
  await expect(page.locator('.capacity-result')).toContainText('AI prediction')
})

test('options failure is retryable without hiding the dataset', async ({
  page,
}) => {
  await page.route('**/api/digital-twin/options', (route) =>
    route.fulfill({ status: 503, json: {} }),
  )
  await page.goto('/')
  await expect(page.getByText('12 of 12 experiments')).toBeVisible()
  await expect(
    page.getByText('Could not load configuration options.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Show details for EXP-003' }).click()
  await expect(
    page.getByRole('button', { name: 'Use in Digital Twin' }),
  ).toHaveCount(0)
  await page.unroute('**/api/digital-twin/options')
  await page.getByRole('button', { name: 'Retry options' }).click()
  await expect(page.getByLabel('Measurement mode')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Use in Digital Twin' }),
  ).toHaveCount(0)
})

test('malformed API responses produce controlled errors', async ({ page }) => {
  await page.route('**/api/experiments', (route) =>
    route.fulfill({ json: { items: [{ id: 'broken' }] } }),
  )
  await page.route('**/api/digital-twin/options', (route) =>
    route.fulfill({ json: { materials: ['bad'] } }),
  )
  await page.goto('/')
  await expect(
    page.getByText('Could not load the dataset.', { exact: false }),
  ).toBeVisible()
  await expect(
    page.getByText('Could not load configuration options.', { exact: false }),
  ).toBeVisible()
  await page.unroute('**/api/experiments')
  await page.unroute('**/api/digital-twin/options')
  await page.getByRole('button', { name: 'Retry dataset' }).click()
  await page.getByRole('button', { name: 'Retry options' }).click()
  await expect(page.getByLabel('Measurement mode')).toBeVisible()
  await page.route('**/api/digital-twin/run', (route) =>
    route.fulfill({
      json: {
        status: 'matched',
        items: [],
      },
    }),
  )
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
  await expect(page.getByText('Could not retrieve a result')).toBeVisible()
  await expect(page.locator('.capacity-result')).toHaveCount(0)
})

test('cohorts adapt to returned conditions and expose per-observation sources', async ({
  page,
}) => {
  await openDashboard(page)
  await expect(
    page.getByLabel('Compatible conditions').locator('option'),
  ).toHaveCount(4)
  await page.getByText('View chart data', { exact: true }).click()
  await expect(page.locator('.chart-data tbody tr')).toHaveCount(9)
  await expect(page.locator('.chart-data')).toContainText('Phase 2 / EXP-003')
  await page.getByLabel('Compatible conditions').selectOption({ index: 1 })
  await expect(
    page.getByText('Only one temperature is available', { exact: false }),
  ).toBeVisible()
  await page.getByText('View chart data', { exact: true }).click()
  await expect(page.locator('.chart-data tbody tr')).toHaveCount(1)
})

test('refresh reloads records from the API and no domain data is stored locally', async ({
  page,
  request,
}) => {
  const records = await (await request.get('/api/experiments')).json()
  await openDashboard(page)
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/experiments') && r.status() === 200,
  )
  await page.reload()
  expect(await (await response).json()).toEqual(records)
  await expect(page.getByText('12 of 12 experiments')).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([
    'h2-triad-theme',
  ])
})
