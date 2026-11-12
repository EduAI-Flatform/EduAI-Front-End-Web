import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'gds-mfa.spec.ts', workers: 1, reporter: 'list', timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5174', headless: true, trace: 'off', video: 'off' },
});
