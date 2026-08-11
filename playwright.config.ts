import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadPlaywrightEnvironment } from "./playwright/environment";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
loadPlaywrightEnvironment(projectRoot);

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./playwright",
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.001,
    },
  },
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  use: {
    baseURL: "http://127.0.0.1:5173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["auth-setup"],
      testIgnore:
        /(?:auth\.setup|production-uat\.spec|spr14-001-production-auth\.spec|spr14-005-production-auth\.spec|spr14-003-004-production-readonly\.spec)\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: [
    {
      command: `${npmCommand} --prefix ../EduAI-Back-End run start:dev`,
      env: {
        AI_PROVIDER: process.env.AI_PROVIDER ?? "mock",
        PUBLIC_APP_URL:
          process.env.PUBLIC_APP_URL ?? "http://127.0.0.1:5173",
      },
      reuseExistingServer: !isCi,
      timeout: 120_000,
      url: "http://127.0.0.1:3000/health",
    },
    {
      command: `${npmCommand} run dev -- --host 127.0.0.1 --port 5173`,
      env: {
        VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? "/api/v1",
        VITE_DEMO_AUTH: process.env.VITE_DEMO_AUTH ?? "true",
      },
      reuseExistingServer: !isCi,
      timeout: 120_000,
      url: "http://127.0.0.1:5173",
    },
  ],
});
