import { defineConfig } from '@playwright/test';

// Synthetic-only runtime verification against an already running local Vite server.
export default defineConfig({
  testDir: '.', testMatch: 'gds-course-authoring.spec.ts', workers: 1,
  reporter: 'list', timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5174', headless: true, trace: 'off', video: 'off' },
});
