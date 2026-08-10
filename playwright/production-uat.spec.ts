import { expect, test } from "@playwright/test";
import type { Page, Response } from "@playwright/test";
import { getAuthStatePath } from "./auth-state";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

const studentRoutes = [
  { path: "/", requiresApi: true },
  { path: "/dashboard", requiresApi: true },
  { path: "/dashboard/learning", requiresApi: true },
  { path: "/dashboard/classrooms", requiresApi: true },
  { path: "/dashboard/library", requiresApi: true },
  { path: "/dashboard/community", requiresApi: true },
  { path: "/dashboard/certificates", requiresApi: true },
  { path: "/dashboard/ai", requiresApi: false },
  { path: "/dashboard/ai/tools", requiresApi: false },
  { path: "/dashboard/profile", requiresApi: true },
];

const instructorRoutes = [
  { path: "/", requiresApi: true },
  { path: "/instructor/dashboard", requiresApi: true },
  { path: "/instructor/dashboard/courses", requiresApi: true },
  { path: "/instructor/dashboard/classrooms", requiresApi: true },
  { path: "/instructor/dashboard/library", requiresApi: true },
  { path: "/instructor/dashboard/ai", requiresApi: false },
];

test.describe("student production navigation", () => {
  test.use({ storageState: getAuthStatePath("student", "production") });

  test("loads every visible route using read-only requests", async ({ context }) => {
    for (const route of studentRoutes) {
      await test.step(route.path, async () => {
        const page = await context.newPage();
        await verifyReadOnlyRoute(page, route.path, route.requiresApi);
        await page.close();
      });
    }
  });

  test("rejects the instructor-only destination", async ({ page }) => {
    const audit = await installReadOnlyAudit(page);
    await page.goto("/instructor/dashboard", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    audit.assertClean();
  });
});

test.describe("instructor production navigation", () => {
  test.use({ storageState: getAuthStatePath("instructor", "production") });

  test("loads every visible route using read-only requests", async ({ context }) => {
    for (const route of instructorRoutes) {
      await test.step(route.path, async () => {
        const page = await context.newPage();
        await verifyReadOnlyRoute(page, route.path, route.requiresApi);
        await page.close();
      });
    }
  });

  test("rejects the platform-administrator-only destination", async ({ page }) => {
    const audit = await installReadOnlyAudit(page);
    await page.goto("/admin/dashboard", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/instructor\/dashboard\/?$/);
    audit.assertClean();
  });
});

test.describe("administrator production navigation", () => {
  test.use({ storageState: getAuthStatePath("administrator", "production") });

  test("loads the live administrator dashboard using read-only requests", async ({
    page,
  }) => {
    const audit = await verifyReadOnlyRoute(page, "/admin/dashboard", true);

    await expect(page.locator(".admin-dashboard-home")).toBeVisible();
    await expect(page.locator(".admin-dashboard-metrics")).toBeVisible();
    expect(audit.apiPaths()).toContain("/api/v1/admin/reports/overview");
    await assertNoHorizontalOverflow(page);
  });

  test("loads the live audit viewer using read-only requests", async ({ page }) => {
    const audit = await verifyReadOnlyRoute(
      page,
      "/admin/dashboard/audit-logs",
      true,
    );

    await expect(page.locator(".admin-audit-page")).toBeVisible();
    await expect(page.locator(".admin-audit-loading")).toHaveCount(0);
    await expect(page.locator(".admin-audit-table")).toBeVisible();
    await expect(page.locator(".admin-audit-table tbody tr").first()).toBeVisible();
    await expect(page.locator(".admin-audit-filters")).toBeVisible();

    const filteredResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === "/api/v1/admin/audit-logs" &&
        url.searchParams.get("search") === "AUTH_LOGIN" &&
        url.searchParams.get("action") === "AUTH_LOGIN" &&
        url.searchParams.get("targetType") === "user"
      );
    });
    await page.locator('.admin-audit-filters input[type="search"]').fill("AUTH_LOGIN");
    await page.locator(".admin-audit-filters select").selectOption("AUTH_LOGIN");
    await page
      .locator('.admin-audit-filters input:not([type="search"])')
      .fill("user");
    await page.locator('.admin-audit-filters button[type="submit"]').click();
    expect((await filteredResponse).status()).toBe(200);

    await expect(page.locator(".admin-audit-loading")).toHaveCount(0);
    await expect(page.locator(".admin-audit-table tbody tr").first()).toBeVisible();
    await expect(page.locator(".admin-audit-pagination")).toBeVisible();
    expect(audit.apiPaths()).toContain("/api/v1/admin/audit-logs");
    audit.assertClean();
    await assertNoHorizontalOverflow(page);
  });
});

async function verifyReadOnlyRoute(
  page: Page,
  route: string,
  requiresApi: boolean,
): Promise<{
  apiPaths: () => string[];
  assertClean: () => void;
}> {
  const audit = await installReadOnlyAudit(page);
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(route)}/?$`));
  await expect(page.locator("main").first()).toBeVisible();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  audit.assertClean();

  if (requiresApi) {
    expect(audit.apiResponseCount()).toBeGreaterThan(0);
  }

  return { apiPaths: audit.apiPaths, assertClean: audit.assertClean };
}

async function installReadOnlyAudit(page: Page): Promise<{
  apiPaths: () => string[];
  apiResponseCount: () => number;
  assertClean: () => void;
}> {
  const blockedMethods: string[] = [];
  const failedApiResponses: string[] = [];
  const requestedApiPaths: string[] = [];
  let apiResponses = 0;
  let consoleErrors = 0;

  await page.route("**/*", async (route) => {
    const method = route.request().method();
    if (!safeMethods.has(method)) {
      blockedMethods.push(`${method} ${safePath(route.request().url())}`);
      await route.abort("blockedbyclient");
      return;
    }

    await route.continue();
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors += 1;
    }
  });
  page.on("response", (response: Response) => {
    if (!response.url().includes("/api/v1/")) {
      return;
    }

    apiResponses += 1;
    requestedApiPaths.push(safePath(response.url()));
    if (response.status() >= 400) {
      failedApiResponses.push(
        `${response.status()} ${response.request().method()} ${safePath(response.url())}`,
      );
    }
  });

  return {
    apiPaths: () => [...requestedApiPaths],
    apiResponseCount: () => apiResponses,
    assertClean: () => {
      expect(blockedMethods).toEqual([]);
      expect(failedApiResponses).toEqual([]);
      expect(consoleErrors).toBe(0);
    },
  };
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "<non-http-resource>";
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
