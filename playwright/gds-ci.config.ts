import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// These suites intercept API requests with synthetic fixtures. No backend,
// production account, payment provider or persistent database is required.
export default defineConfig({
  testDir: '.',
  testMatch: [
    'gds-platform.spec.ts',
    'gds-dynamic-labels.spec.ts',
    'gds-partner-status.spec.ts',
    'gds-card-quota.spec.ts',
    'gds-account.spec.ts',
    'gds-course-authoring.spec.ts',
    'gds-quiz-policy.spec.ts',
    'gds-cards-affiliate.spec.ts',
    'gds-mfa.spec.ts',
    'gds-legacy-inventory.spec.ts',
  ],
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  timeout: 30000,
  outputDir: '../test-results/gds-ci',
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:5174',
    headless: true,
    trace: 'off',
    video: 'off',
  },
  webServer: {
    command: `${process.platform === 'win32' ? 'npm.cmd' : 'npm'} run dev -- --host 127.0.0.1 --port 5174 --strictPort`,
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    url: 'http://127.0.0.1:5174',
    env: { VITE_API_BASE_URL: '/api/v1' },
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
