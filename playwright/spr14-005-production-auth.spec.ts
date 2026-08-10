import { expect, test } from "@playwright/test";
import type { APIResponse, Page, Route } from "@playwright/test";
import { getAuthStatePath, type AuthRole } from "./auth-state";

const adminAuditUrl =
  "https://api.eduai.giaoducso.org.vn/api/v1/admin/audit-logs?page=1&pageSize=25";
const authenticatedProbePath = "/api/v1/library/categories";
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

test("unauthenticated audit access returns HTTP 401 using a read request", async ({
  request,
}) => {
  const response = await request.get(adminAuditUrl);

  expect(response.status()).toBe(401);
  expect(hasSetCookie(response)).toBe(false);
  await response.dispose();
});

for (const matrixEntry of roleMatrix) {
  test.describe(`${matrixEntry.role} audit authorization`, () => {
    test.use({
      storageState: getAuthStatePath(matrixEntry.role, "production"),
    });

    test(`returns HTTP ${matrixEntry.expectedStatus} using only read requests`, async ({
      page,
    }) => {
      const audit = await installOpaqueAuthenticatedProbe(
        page,
        matrixEntry.expectedStatus,
      );

      await page.goto("/library", { waitUntil: "networkidle" });
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
      await expect(audit.status).resolves.toBe(matrixEntry.expectedStatus);
      audit.assertClean();
    });
  });
}

async function installOpaqueAuthenticatedProbe(
  page: Page,
  expectedStatus: 200 | 403,
): Promise<{
  status: Promise<number>;
  assertClean: () => void;
}> {
  const blockedMethods: string[] = [];
  const unexpectedServerErrors: string[] = [];
  let consoleErrors = 0;
  let handledProbe = false;
  let resolveStatus!: (status: number) => void;
  let rejectStatus!: (error: unknown) => void;
  const status = new Promise<number>((resolve, reject) => {
    resolveStatus = resolve;
    rejectStatus = reject;
  });

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors += 1;
  });
  page.on("response", (response) => {
    if (response.url().includes("/api/v1/") && response.status() >= 500) {
      unexpectedServerErrors.push(
        `${response.status()} ${response.request().method()} ${safePath(response.url())}`,
      );
    }
  });

  await page.route("**/*", async (route) => {
    const request = route.request();
    const method = request.method();

    if (!safeMethods.has(method)) {
      blockedMethods.push(`${method} ${safePath(request.url())}`);
      await route.abort("blockedbyclient");
      return;
    }

    if (
      !handledProbe &&
      method === "GET" &&
      safePath(request.url()) === authenticatedProbePath
    ) {
      handledProbe = true;
      await probeAdminAudit(route, expectedStatus, resolveStatus, rejectStatus);
      return;
    }

    await route.continue();
  });

  return {
    status,
    assertClean: () => {
      expect(handledProbe).toBe(true);
      expect(blockedMethods).toEqual([]);
      expect(unexpectedServerErrors).toEqual([]);
      expect(consoleErrors).toBe(0);
    },
  };
}

async function probeAdminAudit(
  route: Route,
  expectedStatus: 200 | 403,
  resolveStatus: (status: number) => void,
  rejectStatus: (error: unknown) => void,
): Promise<void> {
  let originalResponse: APIResponse | undefined;
  let auditResponse: APIResponse | undefined;

  try {
    originalResponse = await route.fetch();
    auditResponse = await route.fetch({ url: adminAuditUrl });
    const status = auditResponse.status();

    expect(status).toBe(expectedStatus);
    expect(hasSetCookie(auditResponse)).toBe(false);

    if (status === 200) {
      assertSanitizedAuditPage(await auditResponse.json());
    }

    resolveStatus(status);
    await route.fulfill({ response: originalResponse });
  } catch (error) {
    rejectStatus(error);
    await route.abort("failed");
  } finally {
    await auditResponse?.dispose();
    await originalResponse?.dispose();
  }
}

function assertSanitizedAuditPage(payload: unknown): void {
  const envelope = asRecord(payload);
  expect(Object.keys(envelope).sort()).toEqual(["data", "message", "success"]);
  expect(envelope.success).toBe(true);

  const data = asRecord(envelope.data);
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
  const items = data.items as unknown[];
  expect(items.length).toBeGreaterThan(0);
  expect(items.length).toBeLessThanOrEqual(25);

  for (const value of items) {
    const item = asRecord(value);
    expect(Object.keys(item).sort()).toEqual([
      "action",
      "actor",
      "actorId",
      "id",
      "metadataJson",
      "occurredAt",
      "targetId",
      "targetType",
    ]);
    expect(Number.isNaN(Date.parse(String(item.occurredAt)))).toBe(false);

    const actor = asRecord(item.actor);
    expect(Object.keys(actor).sort()).toEqual(["email", "fullName", "id"]);
    assertNoSensitiveKeys(item.metadataJson);
  }

  assertNoSensitiveKeys(payload);
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
