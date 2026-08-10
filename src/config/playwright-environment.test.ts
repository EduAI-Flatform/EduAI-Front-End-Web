// @vitest-environment node

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadPlaywrightEnvironment } from "../../playwright/environment";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadPlaywrightEnvironment", () => {
  it("loads the demo password from the frontend .env into Playwright", () => {
    const projectRoot = mkdtempSync(
      path.join(tmpdir(), "eduai-playwright-env-"),
    );
    temporaryDirectories.push(projectRoot);
    writeFileSync(
      path.join(projectRoot, ".env"),
      "DEMO_ACCOUNT_PASSWORD=configured-for-test\n",
    );
    const environment: NodeJS.ProcessEnv = {};

    const result = loadPlaywrightEnvironment(projectRoot, environment);

    expect(result).toEqual({ configured: true });
    expect(environment.DEMO_ACCOUNT_PASSWORD).toBe("configured-for-test");
  });

  it("preserves an explicitly supplied process environment value", () => {
    const projectRoot = mkdtempSync(
      path.join(tmpdir(), "eduai-playwright-env-"),
    );
    temporaryDirectories.push(projectRoot);
    writeFileSync(
      path.join(projectRoot, ".env"),
      "DEMO_ACCOUNT_PASSWORD=file-value\n",
    );
    const environment: NodeJS.ProcessEnv = {
      DEMO_ACCOUNT_PASSWORD: "process-value",
    };

    const result = loadPlaywrightEnvironment(projectRoot, environment);

    expect(result).toEqual({ configured: true });
    expect(environment.DEMO_ACCOUNT_PASSWORD).toBe("process-value");
  });
});
