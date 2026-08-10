import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadPlaywrightEnvironment } from "./playwright/environment";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
loadPlaywrightEnvironment(projectRoot);
process.env.PLAYWRIGHT_AUTH_STATE_SCOPE = "production";

export default defineConfig({
  testDir: "./playwright",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 45_000,
  use: {
    baseURL: "https://eduai.giaoducso.org.vn",
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: "production-auth-setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "production-uat-mobile",
      dependencies: ["production-auth-setup"],
      testMatch: /production-uat\.spec\.ts/,
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: "production-uat-desktop",
      dependencies: ["production-auth-setup"],
      testMatch: /production-uat\.spec\.ts/,
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "production-spr14-admin-api",
      dependencies: ["production-auth-setup"],
      testMatch: /spr14-001-production-auth\.spec\.ts/,
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
