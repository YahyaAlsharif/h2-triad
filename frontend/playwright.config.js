import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
const venvPython = resolve(
  '../backend/.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
)
const python =
  process.env.PLAYWRIGHT_PYTHON ||
  (existsSync(venvPython) ? venvPython : 'python')
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : [
        {
          command: '"' + python + '" tests/start-backend.py',
          url: 'http://127.0.0.1:8001/api/experiments',
          reuseExistingServer: false,
        },
        {
          command: 'npm run dev -- --port 5174',
          url: 'http://localhost:5174',
          env: { VITE_API_PROXY_TARGET: 'http://127.0.0.1:8001' },
          reuseExistingServer: false,
        },
      ],
})
