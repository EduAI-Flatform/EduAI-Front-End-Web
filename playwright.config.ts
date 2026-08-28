import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadPlaywrightEnvironment } from "./playwright/environment";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(projectRoot, "../EduAI-Back-End");
loadPlaywrightEnvironment(projectRoot);

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const isCi = Boolean(process.env.CI);
const skipBackend = process.env.PLAYWRIGHT_SKIP_BACKEND === "1";
const previewFrontend = process.env.PLAYWRIGHT_PREVIEW === "1";
const frontendPort = previewFrontend ? 4173 : 5173;

const frontendServer = {
  command: previewFrontend
    ? `${npmCommand} run preview -- --host 127.0.0.1 --port ${frontendPort}`
    : `${npmCommand} run dev -- --host 127.0.0.1 --port ${frontendPort}`,
  env: {
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? "/api/v1",
  },
  reuseExistingServer: !isCi,
  timeout: 120_000,
  url: `http://127.0.0.1:${frontendPort}`,
};

const backendServer = {
  command: `${npmCommand} run start:dev`,
  cwd: backendRoot,
  env: {
    AI_PROVIDER: process.env.AI_PROVIDER ?? "mock",
    PORT: "3000",
    PUBLIC_APP_URL:
      process.env.PUBLIC_APP_URL ?? "http://127.0.0.1:5173",
  },
  reuseExistingServer: !isCi,
  timeout: 120_000,
  url: "http://127.0.0.1:3000/health",
};

export default defineConfig({
  testDir: "./playwright",
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: [["./playwright/sanitized-reporter.ts"]],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.001,
    },
  },
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    screenshot: "off",
    trace: "off",
    video: "off",
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
  webServer: skipBackend ? [frontendServer] : [backendServer, frontendServer],
});
