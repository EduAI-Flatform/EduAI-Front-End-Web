import { expect, test } from "@playwright/test";
import type { APIResponse, Page, Route } from "@playwright/test";
import { getAuthStatePath } from "./auth-state";

const apiOrigin = "https://api.eduai.giaoducso.org.vn";
const probePath = "/api/v1/library/categories";
const notificationUrls = {
  list: `${apiOrigin}/api/v1/notifications?page=1&pageSize=25`,
  unreadCount: `${apiOrigin}/api/v1/notifications/unread-count`,
  preferences: `${apiOrigin}/api/v1/notifications/preferences`,
};
const unauthenticatedMutationRequests = [
  {
    method: "patch" as const,
    url: `${apiOrigin}/api/v1/notifications/00000000-0000-4000-8000-000000000000/read`,
    data: undefined,
  },
  {
    method: "patch" as const,
    url: `${apiOrigin}/api/v1/notifications/read-all`,
    data: undefined,
  },
  {
    method: "put" as const,
    url: `${apiOrigin}/api/v1/notifications/preferences`,
    data: [],
  },
];
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const sensitiveKeyPattern =
  /(password|token|secret|cookie|authorization|credential|session_?id|api_?key|userId|eventKey|delivery)/i;

test("unauthenticated notification APIs return HTTP 401", async ({ request }) => {
  for (const url of Object.values(notificationUrls)) {
    const response = await request.get(url);
    expect(response.status()).toBe(401);
    expect(hasSetCookie(response)).toBe(false);
    await response.dispose();
  }

  for (const mutation of unauthenticatedMutationRequests) {
    const response = await request[mutation.method](mutation.url, {
      data: mutation.data,
    });
    expect(response.status()).toBe(401);
    expect(hasSetCookie(response)).toBe(false);
    await response.dispose();
  }
});

for (const role of ["student", "instructor", "administrator"] as const) {
  test.describe(`${role} notification read contract`, () => {
    test.use({ storageState: getAuthStatePath(role, "production") });

    test("returns only bounded, sanitized current-user notification data", async ({ page }) => {
      const probe = await installReadOnlyNotificationProbe(page);

      await page.goto("/library", { waitUntil: "domcontentloaded" });
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
      await expect(probe.result).resolves.toEqual({
        list: 200,
        preferences: 200,
        unreadCount: 200,
      });
      probe.assertClean();
    });
  });
}

async function installReadOnlyNotificationProbe(
  page: Page,
): Promise<{
  result: Promise<{ list: number; unreadCount: number; preferences: number }>;
  assertClean: () => void;
}> {
  const blockedMethods: string[] = [];
  const consoleErrors: string[] = [];
  const failedResponses: string[] = [];
  let handledProbe = false;
  let resolveResult!: (value: {
    list: number;
    unreadCount: number;
    preferences: number;
  }) => void;
  let rejectResult!: (reason: unknown) => void;
  const result = new Promise<{
    list: number;
    unreadCount: number;
    preferences: number;
  }>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleErrors.push(message.type());
    }
  });
  page.on("response", (response) => {
    if (response.url().includes("/api/v1/") && response.status() >= 500) {
      failedResponses.push(`${response.status()} ${safePath(response.url())}`);
    }
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (!safeMethods.has(request.method())) {
      blockedMethods.push(`${request.method()} ${safePath(request.url())}`);
      await route.abort("blockedbyclient");
      return;
    }

    if (!handledProbe && safePath(request.url()) === probePath) {
      handledProbe = true;
      await runProbe(route, resolveResult, rejectResult);
      return;
    }

    await route.continue();
  });

  return {
    result,
    assertClean: () => {
      expect(handledProbe).toBe(true);
      expect(blockedMethods).toEqual([]);
      expect(consoleErrors).toEqual([]);
      expect(failedResponses).toEqual([]);
    },
  };
}

async function runProbe(
  route: Route,
  resolve: (value: { list: number; unreadCount: number; preferences: number }) => void,
  reject: (reason: unknown) => void,
): Promise<void> {
  let originalResponse: APIResponse | undefined;
  let listResponse: APIResponse | undefined;
  let unreadCountResponse: APIResponse | undefined;
  let preferencesResponse: APIResponse | undefined;
  let completedResult:
    | { list: number; unreadCount: number; preferences: number }
    | undefined;

  try {
    originalResponse = await route.fetch();
    listResponse = await route.fetch({ url: notificationUrls.list });
    unreadCountResponse = await route.fetch({ url: notificationUrls.unreadCount });
    preferencesResponse = await route.fetch({ url: notificationUrls.preferences });

    expect(listResponse.status()).toBe(200);
    expect(unreadCountResponse.status()).toBe(200);
    expect(preferencesResponse.status()).toBe(200);
    expect(hasSetCookie(listResponse)).toBe(false);
    expect(hasSetCookie(unreadCountResponse)).toBe(false);
    expect(hasSetCookie(preferencesResponse)).toBe(false);

    assertList(await listResponse.json());
    assertUnreadCount(await unreadCountResponse.json());
    assertPreferences(await preferencesResponse.json());
    completedResult = { list: 200, unreadCount: 200, preferences: 200 };
    await route.fulfill({ response: originalResponse });
  } catch (error) {
    reject(error);
    await route.abort("failed");
    return;
  } finally {
    await preferencesResponse?.dispose();
    await unreadCountResponse?.dispose();
    await listResponse?.dispose();
    await originalResponse?.dispose();
  }

  resolve(completedResult!);
}

function assertList(payload: unknown): void {
  const data = asRecord(envelopeData(payload));
  expect(Object.keys(data).sort()).toEqual([
    "items",
    "page",
    "pageSize",
    "total",
    "totalPages",
  ]);
  expect(data.page).toBe(1);
  expect(data.pageSize).toBe(25);
  expect(Array.isArray(data.items)).toBe(true);
  expect((data.items as unknown[]).length).toBeLessThanOrEqual(25);
  assertNoSensitiveKeys(payload);
}

function assertUnreadCount(payload: unknown): void {
  const data = asRecord(envelopeData(payload));
  expect(Object.keys(data)).toEqual(["unreadCount"]);
  expect(Number.isSafeInteger(data.unreadCount)).toBe(true);
  expect((data.unreadCount as number) >= 0).toBe(true);
}

function assertPreferences(payload: unknown): void {
  const data = envelopeData(payload);
  expect(Array.isArray(data)).toBe(true);
  expect((data as unknown[]).length).toBe(10);
  for (const preference of data as unknown[]) {
    const preferenceRecord = asRecord(preference);
    expect(Object.keys(preferenceRecord).sort()).toEqual([
      "category",
      "channel",
      "isEnabled",
    ]);
    expect(["in_app", "email"]).toContain(preferenceRecord.channel);
    expect(preferenceRecord.isEnabled).toBe(
      preferenceRecord.channel === "in_app",
    );
  }
  assertNoSensitiveKeys(payload);
}

function envelopeData(payload: unknown): Record<string, unknown> | unknown[] {
  const envelope = asRecord(payload);
  expect(Object.keys(envelope).sort()).toEqual(["data", "message", "success"]);
  expect(envelope.success).toBe(true);
  return envelope.data as Record<string, unknown> | unknown[];
}

function assertNoSensitiveKeys(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) assertNoSensitiveKeys(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nestedValue] of Object.entries(value)) {
    expect(sensitiveKeyPattern.test(key)).toBe(false);
    assertNoSensitiveKeys(nestedValue);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  expect(value).not.toBeNull();
  expect(Array.isArray(value)).toBe(false);
  expect(typeof value).toBe("object");
  return value as Record<string, unknown>;
}

function hasSetCookie(response: APIResponse): boolean {
  return response.headersArray().some((header) => header.name.toLowerCase() === "set-cookie");
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "<non-http-resource>";
  }
}
