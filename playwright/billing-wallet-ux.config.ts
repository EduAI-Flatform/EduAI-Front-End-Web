import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'billing-wallet-ux.spec.ts', workers: 1, reporter: 'list', timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:5175', headless: true, trace: 'off', video: 'off' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort', url: 'http://127.0.0.1:5175', reuseExistingServer: true },
});
