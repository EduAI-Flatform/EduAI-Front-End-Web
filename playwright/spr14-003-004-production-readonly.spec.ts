import { expect, test } from "@playwright/test";
import type { APIResponse, Page, Route } from "@playwright/test";
import { getAuthStatePath, type AuthRole } from "./auth-state";

const apiOrigin = "https://api.eduai.giaoducso.org.vn";
const authenticatedProbePath = "/api/v1/library/categories";
const adminUsersUrl = `${apiOrigin}/api/v1/admin/users?page=1&pageSize=25`;
const adminModerationUrl =
  `${apiOrigin}/api/v1/admin/moderation?targetType=course&page=1&pageSize=25`;
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const sensitiveKeyPattern =
  /(password|token|secret|cookie|authorization|credential|session_?id|api_?key)/i;

const roleMatrix: Array<{
  role: AuthRole;
  expectedStatus: 200 | 403;
}> = [
  { role: "student", expectedStatus: 403 },
  { role: "instructor", expectedStatus: 403 },
  { role: "administrator", expectedStatus: 200 },
];

test("unauthenticated user and moderation reads return HTTP 401", async ({
  request,
}) => {
  for (const url of [adminUsersUrl, adminModerationUrl]) {
    const response = await request.get(url);
    expect(response.status()).toBe(401);
    expect(hasSetCookie(response)).toBe(false);
    await response.dispose();
  }
});

for (const matrixEntry of roleMatrix) {
  test.describe(`${matrixEntry.role} remaining Sprint 14 read authorization`, () => {
    test.use({
      storageState: getAuthStatePath(matrixEntry.role, "production"),
    });

    test(`returns HTTP ${matrixEntry.expectedStatus} for both admin read APIs`, async ({
      page,
    }) => {
      const probe = await installReadOnlyAdminProbe(
        page,
        matrixEntry.expectedStatus,
      );

      await page.goto("/library", { waitUntil: "domcontentloaded" });
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
      await expect(probe.statuses).resolves.toEqual({
        moderation: matrixEntry.expectedStatus,
        users: matrixEntry.expectedStatus,
      });
      probe.assertClean();
    });
  });
}

test.describe("administrator remaining Sprint 14 live views", () => {
  test.use({
    storageState: getAuthStatePath("administrator", "production"),
  });

  for (const viewport of [
    { name: "320", width: 320, height: 800 },
    { name: "1440", width: 1440, height: 900 },
  ]) {
    test(`renders live user and moderation data at ${viewport.name}px`, async ({
      page,
    }) => {
      const runtime = await guardReadOnlyRuntime(page);
      await page.setViewportSize(viewport);

      const usersResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          safePath(response.url()) === "/api/v1/admin/users",
      );
      await page.goto("/admin/dashboard/users");
      expect((await usersResponse).status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: "Quản lý người dùng" }),
      ).toBeVisible();
      await assertResponsivePage(page);

      const moderationResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          safePath(response.url()) === "/api/v1/admin/moderation",
      );
      await page.goto("/admin/dashboard/moderation");
      expect((await moderationResponse).status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: "Kiểm duyệt nội dung" }),
      ).toBeVisible();
      await assertResponsivePage(page);

      runtime.assertClean();
    });
  }
});

for (const matrixEntry of [
  { role: "student" as const, expectedPath: "/dashboard" },
  { role: "instructor" as const, expectedPath: "/instructor/dashboard" },
]) {
  test.describe(`${matrixEntry.role} remaining Sprint 14 route rejection`, () => {
    test.use({
      storageState: getAuthStatePath(matrixEntry.role, "production"),
    });

    test("redirects both administrator views without a write request", async ({
      page,
    }) => {
      const runtime = await guardReadOnlyRuntime(page, true);

      await page.goto("/admin/dashboard/users");
      await expect(page).toHaveURL(
        new URL(matrixEntry.expectedPath, page.url()).toString(),
      );

      await page.goto("/admin/dashboard/moderation");
      await expect(page).toHaveURL(
        new URL(matrixEntry.expectedPath, page.url()).toString(),
      );

      runtime.assertClean();
    });
  });
}

async function installReadOnlyAdminProbe(
  page: Page,
  expectedStatus: 200 | 403,
): Promise<{
  statuses: Promise<{ moderation: number; users: number }>;
  assertClean: () => void;
}> {
  const runtime = await guardReadOnlyRuntime(page, true);
  let handledProbe = false;
  let resolveStatuses!: (statuses: {
    moderation: number;
    users: number;
  }) => void;
  let rejectStatuses!: (error: unknown) => void;
  const statuses = new Promise<{ moderation: number; users: number }>(
    (resolve, reject) => {
      resolveStatuses = resolve;
      rejectStatuses = reject;
    },
  );

  await page.route("**/*", async (route) => {
    const request = route.request();
    if (!safeMethods.has(request.method())) {
      await route.abort("blockedbyclient");
      return;
    }

    if (
      !handledProbe &&
      request.method() === "GET" &&
      safePath(request.url()) === authenticatedProbePath
    ) {
      handledProbe = true;
      await runAdminReadProbe(
        route,
        expectedStatus,
        resolveStatuses,
        rejectStatuses,
      );
      return;
    }

    await route.continue();
  });

  return {
    statuses,
    assertClean: () => {
      expect(handledProbe).toBe(true);
      runtime.assertClean();
    },
  };
}

async function runAdminReadProbe(
  route: Route,
  expectedStatus: 200 | 403,
  resolveStatuses: (statuses: { moderation: number; users: number }) => void,
  rejectStatuses: (error: unknown) => void,
): Promise<void> {
  let originalResponse: APIResponse | undefined;
  let usersResponse: APIResponse | undefined;
  let moderationResponse: APIResponse | undefined;
  let completedStatuses: { moderation: number; users: number } | undefined;

  try {
    originalResponse = await route.fetch();
    usersResponse = await route.fetch({ url: adminUsersUrl });
    moderationResponse = await route.fetch({ url: adminModerationUrl });

    expect(usersResponse.status()).toBe(expectedStatus);
    expect(moderationResponse.status()).toBe(expectedStatus);
    expect(hasSetCookie(usersResponse)).toBe(false);
    expect(hasSetCookie(moderationResponse)).toBe(false);

    if (expectedStatus === 200) {
      assertAdminUsersPage(await usersResponse.json());
      assertModerationPage(await moderationResponse.json());
    }

    completedStatuses = {
      moderation: moderationResponse.status(),
      users: usersResponse.status(),
    };
    await route.fulfill({ response: originalResponse });
  } catch (error) {
    rejectStatuses(error);
    await route.abort("failed");
    return;
  } finally {
    await moderationResponse?.dispose();
    await usersResponse?.dispose();
    await originalResponse?.dispose();
  }

  resolveStatuses(completedStatuses!);
}

async function guardReadOnlyRuntime(
  page: Page,
  allowExpectedForbiddenResponses = false,
): Promise<{ assertClean: () => void }> {
  const blockedMethods: string[] = [];
  const consoleErrors: string[] = [];
  const failedApiResponses: string[] = [];
  const requestFailures: string[] = [];

  await page.route("**/*", async (route) => {
    if (!safeMethods.has(route.request().method())) {
      await route.abort("blockedbyclient");
      return;
    }
    await route.fallback();
  });
  page.on("request", (request) => {
    if (!safeMethods.has(request.method())) {
      blockedMethods.push(`${request.method()} ${safePath(request.url())}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleErrors.push(message.type());
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "";
    if (
      failure === "net::ERR_ABORTED" &&
      /\.(mp4|webm|ogg)(?:$|[?#])/i.test(request.url())
    ) {
      return;
    }
    requestFailures.push(`${request.method()} ${safePath(request.url())}`);
  });
  page.on("response", (response) => {
    if (!response.url().includes("/api/v1/")) return;
    if (response.status() >= 500) {
      failedApiResponses.push(
        `${response.status()} ${response.request().method()} ${safePath(response.url())}`,
      );
      return;
    }
    if (!allowExpectedForbiddenResponses && response.status() >= 400) {
      failedApiResponses.push(
        `${response.status()} ${response.request().method()} ${safePath(response.url())}`,
      );
    }
  });

  return {
    assertClean: () => {
      expect(blockedMethods).toEqual([]);
      expect(consoleErrors).toEqual([]);
      expect(failedApiResponses).toEqual([]);
      expect(requestFailures).toEqual([]);
    },
  };
}

async function assertResponsivePage(page: Page): Promise<void> {
  const dimensions = await page.locator("body").evaluate((body) => ({
    clientWidth: body.clientWidth,
    scrollWidth: body.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await expect(page.locator("body")).not.toContainText(/coming soon|stitch-/i);
}

function assertAdminUsersPage(payload: unknown): void {
  const data = envelopeData(payload);
  expect(Object.keys(data).sort()).toEqual([
    "items",
    "page",
    "pageSize",
    "total",
    "totalPages",
  ]);
  expect(data.page).toBe(1);
  expect(data.pageSize).toBe(25);
  expect(Number.isSafeInteger(data.total)).toBe(true);
  expect(Number.isSafeInteger(data.totalPages)).toBe(true);
  expect(Array.isArray(data.items)).toBe(true);
  expect((data.items as unknown[]).length).toBeLessThanOrEqual(25);

  for (const value of data.items as unknown[]) {
    const item = asRecord(value);
    expect(Object.keys(item).sort()).toEqual([
      "authProvider",
      "createdAt",
      "email",
      "emailVerified",
      "fullName",
      "id",
      "roles",
      "status",
      "updatedAt",
    ]);
  }
  assertNoSensitiveKeys(payload);
}

function assertModerationPage(payload: unknown): void {
  const data = envelopeData(payload);
  expect(Object.keys(data).sort()).toEqual([
    "items",
    "page",
    "pageSize",
    "total",
    "totalPages",
  ]);
  expect(data.page).toBe(1);
  expect(data.pageSize).toBe(25);
  expect(Number.isSafeInteger(data.total)).toBe(true);
  expect(Number.isSafeInteger(data.totalPages)).toBe(true);
  expect(Array.isArray(data.items)).toBe(true);
  expect((data.items as unknown[]).length).toBeLessThanOrEqual(25);

  for (const value of data.items as unknown[]) {
    const item = asRecord(value);
    expect(Object.keys(item).sort()).toEqual([
      "content",
      "createdAt",
      "id",
      "moderatedAt",
      "moderationReason",
      "moderationStatus",
      "owner",
      "targetType",
      "title",
      "updatedAt",
    ]);
    expect(Object.keys(asRecord(item.owner)).sort()).toEqual([
      "fullName",
      "id",
    ]);
  }
  assertNoSensitiveKeys(payload);
}

function envelopeData(payload: unknown): Record<string, unknown> {
  const envelope = asRecord(payload);
  expect(Object.keys(envelope).sort()).toEqual(["data", "message", "success"]);
  expect(envelope.success).toBe(true);
  return asRecord(envelope.data);
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
  return response
    .headersArray()
    .some((header) => header.name.toLowerCase() === "set-cookie");
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "<non-http-resource>";
  }
}
