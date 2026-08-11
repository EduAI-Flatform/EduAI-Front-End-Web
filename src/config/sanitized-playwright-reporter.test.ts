// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import type { TestCase, TestResult } from "@playwright/test/reporter";
import SanitizedReporter from "../../playwright/sanitized-reporter";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SanitizedReporter", () => {
  it("reports a failed title and status without printing failure details", () => {
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message) => {
      output.push(String(message));
    });
    const reporter = new SanitizedReporter();
    const testCase = {
      titlePath: () => ["root", "production project", "safe check"],
    } as TestCase;
    const result = {
      status: "failed",
      error: { message: "sensitive-browser-error-context" },
    } as TestResult;

    reporter.onTestEnd(testCase, result);

    expect(output).toEqual([
      "FAILED: production project > safe check",
    ]);
    expect(output.join(" ")).not.toContain("sensitive-browser-error-context");
  });
});
