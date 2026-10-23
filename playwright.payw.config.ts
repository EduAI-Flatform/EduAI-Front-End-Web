import {defineConfig,devices} from '@playwright/test';
// Synthetic UI fixtures only: no dotenv loader, backend process or real financial API.
export default defineConfig({testDir:'./playwright',testMatch:'payw-receipt-review.spec.ts',fullyParallel:false,workers:1,
  retries:0,reporter:[['list']],timeout:30000,use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5174',trace:'off',video:'off'},
  webServer:{command:'npm run dev -- --config vite.payw.config.ts --host 127.0.0.1 --port 5174',url:'http://127.0.0.1:5174',reuseExistingServer:false,
    env:{VITE_API_BASE_URL:'/api/v1'},timeout:60000}});