import { defineConfig, devices } from "@playwright/test";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./playwright",
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
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
      testIgnore: /auth\.setup\.ts/,
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
      url: "http://127.0.0.1:3000/api/v1/courses",
    },
    {
      command: `${npmCommand} run dev -- --host 127.0.0.1 --port 5173`,
      reuseExistingServer: !isCi,
      timeout: 120_000,
      url: "http://127.0.0.1:5173",
    },
  ],
});
