// Capture the real local app. Start Compose first; no fixture responses or mockups.
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'

const require = createRequire(new URL('../../frontend/package.json', import.meta.url))
const { chromium, expect } = require('@playwright/test')
const directory = fileURLToPath(new URL('../../docs/images/', import.meta.url))
await mkdir(directory, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173')
  await page.getByRole('button', { name: 'Run Digital Twin' }).click()
  await expect(page.locator('.science-tag')).toHaveText('AI prediction')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `${directory}/digital-twin.png`, animations: 'disabled' })
  await page.getByRole('button', { name: 'Generate landscape' }).click()
  await expect.poll(() => page.locator('.prediction-surface').evaluate(el => el.data?.length)).toBe(2)
  await expect(page.locator('.landscape-panel')).toContainText('400 of 400 cells supported')
  await page.locator('.landscape-panel').screenshot({ path: `${directory}/prediction-landscape.png`, animations: 'disabled' })
} finally {
  await browser.close()
}
