import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

/** Admin session, created by tests/auth/auth.setup.ts and used by every UI spec by default. */
export const STORAGE_STATE = '.auth/admin.json';
/** Diagnostic-module user session (DIAG_USER in .env), created by tests/modules/diagnostic/tests/diag.setup.ts. */
export const DIAG_STORAGE_STATE = '.auth/diag.json';

export default defineConfig({
  // Shared specs live in tests/, module specs in tests/modules/<module>/tests/.
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
    { name: 'setup', testMatch: /tests[\\/]auth[\\/]auth\.setup\.ts/ },
    { name: 'setup:diag', testMatch: /diag\.setup\.ts/ },
    {
      // Shared UI specs (auth, smoke) + every module except diagnostic.
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: [/tests[\\/]api[\\/]/, /modules[\\/]diagnostic[\\/]/],
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
    },
    {
      // Diagnostic module: runs as admin. To use the diagnostic user instead, add
      // 'setup:diag' to dependencies and `test.use({ storageState: DIAG_STORAGE_STATE })`.
      name: 'diagnostic',
      dependencies: ['setup'],
      testMatch: 'modules/diagnostic/tests/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
        // Diagnostic screens are wide: below ~1400px the totals panel overlaps the
        // form and intercepts clicks (investigation entry), so use a desktop-size window.
        viewport: { width: 1600, height: 1000 },
      },
    },
    {
      // REST API tests — no browser, no UI login needed.
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: process.env.API_BASE_URL },
    },
  ],
});
