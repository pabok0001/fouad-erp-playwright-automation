import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

export const STORAGE_STATE = '.auth/admin.json';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1, // run tests one at a time
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL,
    // Browser window is shown by default; set HEADLESS=true (or run in CI) to hide it.
    headless: process.env.HEADLESS === 'true' || !!process.env.CI,
    ignoreHTTPSErrors: true, // server uses a self-signed certificate
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /tests[\\/]api[\\/]/,
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
    },
    {
      // REST API tests — no browser, no UI login needed.
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: process.env.API_BASE_URL },
    },
  ],
});
