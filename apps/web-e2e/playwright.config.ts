import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const useRealApi = process.env.E2E_REAL_API === 'true';
const baseURL = externalBaseUrl || 'http://127.0.0.1:4173';
const apiBaseURL = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:3333/api';

export default defineConfig({
  testDir: './tests',
  testIgnore: useRealApi
    ? ['**/production-pilot-reviewer-smoke.spec.ts']
    : ['**/real-api/**'],
  outputDir: './test-results',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : useRealApi
    ? [
        {
          command: 'node scripts/e2e/start-api.mjs',
          cwd: projectRoot,
          url: apiBaseURL.replace(/\/api\/?$/, '/api/health'),
          reuseExistingServer: false,
          timeout: 120_000,
        },
        {
          command: 'node scripts/e2e/start-web.mjs',
          cwd: projectRoot,
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ]
    : {
        command: 'pnpm exec vite --host 127.0.0.1 --port 4173',
        cwd: projectRoot,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
