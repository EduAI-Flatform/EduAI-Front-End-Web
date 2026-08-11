import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./playwright",
  testMatch: [
    /responsive-visual\.spec\.ts/,
    /admin-.*-responsive\.spec\.ts/,
  ],
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: "list",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.001,
    },
  },
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:5173",
    screenshot: "off",
    trace: "off",
    video: "off",
  },
});
