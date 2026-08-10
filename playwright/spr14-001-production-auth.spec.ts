import { expect, test } from "@playwright/test";
import type { APIResponse, Page, Route } from "@playwright/test";
import { getAuthStatePath, type AuthRole } from "./auth-state";

const adminOverviewUrl =
  "https://api.eduai.giaoducso.org.vn/api/v1/admin/reports/overview";
const authenticatedProbePath = "/api/v1/library/categories";
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

const roleMatrix: Array<{
  role: AuthRole;
  expectedStatus: 200 | 403;
}> = [
  { role: "student", expectedStatus: 403 },
  { role: "instructor", expectedStatus: 403 },
  { role: "administrator", expectedStatus: 200 },
];

const expectedMetricKeys = {
  users: ["active", "inactive", "suspended", "total"],
  roles: ["instructor", "platformAdmin", "student"],
  courses: ["archived", "draft", "published", "total"],
  enrollments: ["active", "completed", "other", "total"],
  certificates: ["issued"],
  aiUsage: [
    "conversations",
    "embeddings",
    "flashcards",
    "generatedQuizzes",
    "messages",
  ],
  classrooms: ["cancelled", "ended", "live", "scheduled", "total"],
  community: ["comments", "posts", "reactions"],
  library: ["categories", "resources", "savedResources", "tags"],
} as const;

for (const matrixEntry of roleMatrix) {
  test.describe(`${matrixEntry.role} admin overview authorization`, () => {
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
    if (message.type() === "error") {
      consoleErrors += 1;
    }
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
      await probeAdminOverview(route, expectedStatus, resolveStatus, rejectStatus);
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

async function probeAdminOverview(
  route: Route,
  expectedStatus: 200 | 403,
  resolveStatus: (status: number) => void,
  rejectStatus: (error: unknown) => void,
): Promise<void> {
  let originalResponse: APIResponse | undefined;
  let adminResponse: APIResponse | undefined;

  try {
    originalResponse = await route.fetch();
    adminResponse = await route.fetch({ url: adminOverviewUrl });
    const status = adminResponse.status();

    expect(status).toBe(expectedStatus);
    expect(
      adminResponse
        .headersArray()
        .some((header) => header.name.toLowerCase() === "set-cookie"),
    ).toBe(false);

    if (status === 200) {
      assertAggregateOnlyResponse(await adminResponse.json());
    }

    resolveStatus(status);
    await route.fulfill({ response: originalResponse });
  } catch (error) {
    rejectStatus(error);
    await route.abort("failed");
  } finally {
    await adminResponse?.dispose();
    await originalResponse?.dispose();
  }
}

function assertAggregateOnlyResponse(payload: unknown): void {
  const envelope = asRecord(payload);

  expect(Object.keys(envelope).sort()).toEqual(["data", "message", "success"]);
  expect(envelope.success).toBe(true);
  expect(typeof envelope.message).toBe("string");

  const data = asRecord(envelope.data);
  expect(Object.keys(data).sort()).toEqual(Object.keys(expectedMetricKeys).sort());

  for (const [sectionName, fieldNames] of Object.entries(expectedMetricKeys)) {
    const section = asRecord(data[sectionName]);
    expect(Object.keys(section).sort()).toEqual([...fieldNames].sort());

    for (const fieldName of fieldNames) {
      const value = section[fieldName];
      expect(typeof value).toBe("number");
      if (typeof value !== "number") {
        throw new Error("Expected an aggregate numeric count.");
      }
      expect(Number.isSafeInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  expect(value).not.toBeNull();
  expect(Array.isArray(value)).toBe(false);
  expect(typeof value).toBe("object");
  return value as Record<string, unknown>;
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "<non-http-resource>";
  }
}
