import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function openDashboard(page) {
  await page.goto('/')
  await expect(page.getByText('12 of 12 experiments')).toBeVisible()
}

test('Digital Twin keeps mock results tied to exact conditions', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await openDashboard(page)
  await expect(page.getByText('Your configuration, in context.')).toBeVisible()
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
  await expect(page.getByText('Loading demo result')).toBeVisible()
  await expect(page.getByLabel('Base material')).toBeDisabled()
  await expect(page.locator('.capacity-result')).toContainText('6.2')
  await expect(page.locator('.result-configuration')).toContainText(
    '300 °C · 10 bar · 4 h milling · 100 nm',
  )
  await page.getByLabel('Hydrogen pressure (bar)').fill('20')
  await expect(
    page.getByText('Inputs changed.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
  await expect(page.getByText('No fixture for these conditions')).toBeVisible()
  await expect(page.locator('.capacity-result')).toHaveCount(0)
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await page.getByLabel('Additive / catalyst').selectOption('Fe–Ni / N-C')
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
  await expect(page.locator('.capacity-result')).toContainText('6.5')
  await page.getByLabel('Additive / catalyst').selectOption('None')
  await expect(page.getByLabel('Additive concentration (wt%)')).toHaveValue('0')
  await expect(page.getByLabel('Additive concentration (wt%)')).toBeDisabled()
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
  await expect(page.locator('.result-outcome')).toContainText('Limited')
  await page.getByLabel('Preparation method').selectOption('Solution mixing')
  await expect(page.getByLabel('Ball milling time (h)')).toHaveValue('0')
  await expect(page.getByLabel('Ball milling time (h)')).toBeDisabled()
  await page.getByLabel('Base material').selectOption('NaAlH₄')
  await page.getByLabel('Temperature (°C)').fill('')
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
  await expect(page.getByLabel('Temperature (°C)')).toBeFocused()
  expect(errors).toEqual([])
})

test('dataset search, filters, sorting, details and configuration handoff', async ({
  page,
}) => {
  await openDashboard(page)
  await page.getByLabel('Search experiments').fill('EXP-011')
  await expect(page.getByText('1 of 12 experiments')).toBeVisible()
  await page.getByRole('button', { name: 'Show details for EXP-011' }).click()
  await expect(page.locator('.experiment-detail')).toContainText(
    'Synthetic demo fixture',
  )
  await page.getByRole('button', { name: 'Use in Digital Twin' }).click()
  await expect(page.getByLabel('Hydrogen pressure (bar)')).toHaveValue('20')
  await expect(page.getByLabel('Ball milling time (h)')).toHaveValue('8')
  await expect(page.getByLabel('Particle size (nm)')).toHaveValue('80')
  await expect(page.getByLabel('Base material')).toBeFocused()
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
  await expect(page.locator('.different-condition')).toHaveCount(3)
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
  await expect(page.locator('.recharts-line')).toHaveCount(3)
  await page.locator('.recharts-line-dots circle').first().hover()
  await expect(page.locator('.chart-tooltip')).toBeVisible()
  await page.getByText('View chart data', { exact: true }).click()
  await expect(page.locator('.chart-data')).toContainText('6.4 wt%')
  for (const name of ['Ni', 'Fe–Ni / N-C', 'TiF₃'])
    await page.getByRole('button', { name, exact: true }).click()
  await expect(
    page.getByText('Select an additive to show its series.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Ni', exact: true }).click()
  await expect(page.locator('.recharts-line')).toHaveCount(1)
})

test('health errors and retry do not block mock interactions', async ({
  page,
}) => {
  await page.route('**/api/health', (route) =>
    route.fulfill({
      status: 503,
      json: { api: 'connected', database: 'disconnected' },
    }),
  )
  await openDashboard(page)
  await page.getByText('System offline', { exact: true }).click()
  await expect(
    page.getByText('The mock workspace is still available.', { exact: false }),
  ).toBeVisible()
  await page.unroute('**/api/health')
  await page.getByRole('button', { name: 'Check again' }).click()
  await expect(
    page.getByText('System connected', { exact: true }),
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
  ).toBeVisible()
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

test('dataset and simulation failures have recoverable UI states', async ({
  page,
}, testInfo) => {
  // Fault injection stays in the browser test, never in the application adapter.
  await page.route('**/src/data/dashboardService.js', async (route) => {
    const response = await route.fetch()
    let body = await response.text()
    expect(body).toContain('await delay(450, signal)')
    body = body.replace(
      /await delay\(450, signal\);?/,
      'await delay(800, signal); if (!window.__qaDatasetRecovered) throw new Error("Dataset test failure");',
    )
    body = body.replace(
      /await delay\(850, signal\);?/,
      'await delay(850, signal); if (!window.__qaPredictionRecovered) throw new Error("Prediction test failure");',
    )
    await route.fulfill({ response, body })
  })
  await page.goto('/')
  await expect(page.getByText('Loading demo experiments…')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('dataset-loading.png') })
  await expect(page.getByText('Could not load the demo dataset.')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('dataset-error.png') })
  await page.evaluate(() => {
    window.__qaDatasetRecovered = true
  })
  await page.getByRole('button', { name: 'Retry dataset' }).click()
  await expect(page.getByText('12 of 12 experiments')).toBeVisible()
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
  await expect(
    page.getByText('Demo result unavailable', { exact: true }),
  ).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('prediction-error.png') })
  await page.evaluate(() => {
    window.__qaPredictionRecovered = true
  })
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
  await expect(page.locator('.capacity-result')).toContainText('6.2')
})
