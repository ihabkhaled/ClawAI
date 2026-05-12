import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the claw-frontend admin module smoke tests.
 *
 * Assumes the dev stack is already up at http://localhost:3000 (claw-frontend
 * container) and http://localhost:4000 (nginx reverse proxy to backend).
 * Run with: `npm run test:e2e` from apps/claw-frontend.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
