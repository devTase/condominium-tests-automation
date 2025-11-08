import { defineConfig, devices } from '@playwright/test';

const uiPort = Number(process.env.UI_PORT ?? 4200);
const uiHost = process.env.UI_HOST ?? 'localhost';
const uiBaseUrl = process.env.UI_BASE_URL ?? `http://${uiHost}:${uiPort}`;

const shouldStartServices = process.env.E2E_NO_SERVICES !== '1' && process.env.CI !== 'true';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: uiBaseUrl,
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: shouldStartServices
    ? [
        {
          command: 'npm run services:start',
          port: uiPort,
          timeout: 240_000,
          reuseExistingServer: !process.env.CI,
          stdout: 'pipe',
          stderr: 'pipe',
        },
      ]
    : undefined,
});


