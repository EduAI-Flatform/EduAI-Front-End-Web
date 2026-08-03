import { expect, type Page, type Response } from "@playwright/test";

export interface RuntimeGuard {
  assertClean(): void;
}

export function guardRuntime(page: Page): RuntimeGuard {
  const consoleErrors: string[] = [];
  const failedResponses: string[] = [];
  const requestFailures: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleErrors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    requestFailures.push(
      `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`,
    );
  });
  page.on("response", (response: Response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  return {
    assertClean() {
      expect(consoleErrors, "console errors or warnings").toEqual([]);
      expect(failedResponses, "failed HTTP responses").toEqual([]);
      expect(requestFailures, "failed network requests").toEqual([]);
    },
  };
}

export async function assertNoStitchData(page: Page) {
  await expect(page.locator("body")).not.toContainText(/stitch-/i);
}

export function expectUuid(value: string) {
  expect(value).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
}
