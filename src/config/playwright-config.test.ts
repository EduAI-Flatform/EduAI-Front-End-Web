// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const originalApiBaseUrl = process.env.VITE_API_BASE_URL;
const originalDemoAuth = process.env.VITE_DEMO_AUTH;
const originalDemoPassword = process.env.DEMO_ACCOUNT_PASSWORD;

afterEach(() => {
  restoreEnvironment("VITE_API_BASE_URL", originalApiBaseUrl);
  restoreEnvironment("VITE_DEMO_AUTH", originalDemoAuth);
  restoreEnvironment("DEMO_ACCOUNT_PASSWORD", originalDemoPassword);
  vi.resetModules();
});

describe("Playwright configuration", () => {
  it("starts Vite with local demo authentication and the local API proxy", async () => {
    delete process.env.VITE_API_BASE_URL;
    delete process.env.VITE_DEMO_AUTH;
    process.env.DEMO_ACCOUNT_PASSWORD = "configured-for-test";
    const { default: playwrightConfig } = await import(
      "../../playwright.config"
    );
    const webServers = Array.isArray(playwrightConfig.webServer)
      ? playwrightConfig.webServer
      : [];

    expect(webServers).toHaveLength(2);
    expect(webServers[1].env).toMatchObject({
      VITE_API_BASE_URL: "/api/v1",
      VITE_DEMO_AUTH: "true",
    });
    expect(webServers[0].env).not.toHaveProperty("VITE_API_BASE_URL");
    expect(webServers[0].env).not.toHaveProperty("VITE_DEMO_AUTH");
    expect(webServers[0].url).toBe("http://127.0.0.1:3000/health");

    const chromiumProject = playwrightConfig.projects?.find(
      ({ name }) => name === "chromium",
    );
    expect(chromiumProject?.testIgnore).toEqual(
      /(?:auth\.setup|production-uat\.spec|spr14-001-production-auth\.spec|spr14-005-production-auth\.spec)\.ts/,
    );
    expect(playwrightConfig.expect?.toHaveScreenshot?.maxDiffPixelRatio).toBe(
      0.001,
    );
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
