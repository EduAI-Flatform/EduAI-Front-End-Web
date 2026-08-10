import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { assertNoStitchData, guardRuntime } from "./runtime-guards";

const authStatePath = (role: "student" | "instructor" | "administrator") =>
  path.join(process.cwd(), "playwright", ".auth", `${role}.json`);

const viewports = [
  { name: "320", width: 320, height: 800 },
  { name: "1440", width: 1440, height: 1000 },
];

test.describe("administrator dashboard live integration", () => {
  test.use({ storageState: authStatePath("administrator") });

  test("loads the authenticated aggregate endpoint", async ({ page }) => {
    const runtime = guardRuntime(page);
    const overviewResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/admin/reports/overview") &&
        response.request().method() === "GET",
    );

    await page.goto("/admin/dashboard");
    const response = await overviewResponse;

    expect(response.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Tổng quan nền tảng" }),
    ).toBeVisible();
    await expect(page.locator(".admin-dashboard-metric")).toHaveCount(4);
    await page.waitForLoadState("networkidle");
    await assertNoStitchData(page);
    runtime.assertClean();
  });
});

test.describe("administrator dashboard responsive visuals", () => {
  test.use({ storageState: authStatePath("administrator") });

  for (const viewport of viewports) {
    test(`renders deterministic aggregates at ${viewport.name}px`, async ({
      page,
    }) => {
      await installLayoutFixture(page);
      const runtime = guardRuntime(page);
      await page.setViewportSize(viewport);
      await page.goto("/admin/dashboard");

      await expect(
        page.getByRole("heading", { name: "Tổng quan nền tảng" }),
      ).toBeVisible();
      const dimensions = await page.locator("body").evaluate((body) => ({
        clientWidth: body.clientWidth,
        scrollWidth: body.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(
        dimensions.clientWidth + 1,
      );

      await assertNoStitchData(page);
      await expect(page).toHaveScreenshot(
        `admin-dashboard-${viewport.name}.png`,
        { fullPage: true },
      );
      runtime.assertClean();
    });

    test(`renders the audit log at ${viewport.name}px`, async ({ page }) => {
      await installLayoutFixture(page);
      const runtime = guardRuntime(page);
      await page.setViewportSize(viewport);
      await page.goto("/admin/dashboard/audit-logs");

      await expect(
        page.getByRole("heading", { name: "Nhật ký kiểm toán" }),
      ).toBeVisible();
      await expect(page.getByRole("table")).toBeVisible();
      const dimensions = await page.locator("body").evaluate((body) => ({
        clientWidth: body.clientWidth,
        scrollWidth: body.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(
        dimensions.clientWidth + 1,
      );

      await assertNoStitchData(page);
      await expect(page).toHaveScreenshot(`admin-audit-${viewport.name}.png`, {
        fullPage: true,
      });
      runtime.assertClean();
    });
  }
});

for (const role of ["student", "instructor"] as const) {
  test(`${role} is redirected away from the administrator dashboard`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: authStatePath(role) });
    const page = await context.newPage();

    try {
      await page.goto("/admin/dashboard");
      await expect(page).toHaveURL(
        role === "student"
          ? /\/dashboard\/?$/
          : /\/instructor\/dashboard\/?$/,
      );
    } finally {
      await context.close();
    }
  });
}

async function installLayoutFixture(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/reports/overview", (route) =>
    route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: {
          users: { total: 42, active: 37, inactive: 3, suspended: 2 },
          roles: { student: 34, instructor: 7, platformAdmin: 1 },
          courses: { total: 12, draft: 3, published: 8, archived: 1 },
          enrollments: { total: 91, active: 64, completed: 24, other: 3 },
          certificates: { issued: 18 },
          aiUsage: {
            conversations: 15,
            messages: 74,
            generatedQuizzes: 6,
            flashcards: 23,
            embeddings: 128,
          },
          classrooms: {
            total: 9,
            scheduled: 4,
            live: 1,
            ended: 3,
            cancelled: 1,
          },
          community: { posts: 21, comments: 55, reactions: 89 },
          library: {
            resources: 31,
            categories: 5,
            tags: 14,
            savedResources: 47,
          },
        },
      }),
    }),
  );
  await page.route("**/api/v1/admin/audit-logs?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: {
          items: [
            {
              id: "audit-1",
              actorId: "admin-1",
              action: "COURSE_PUBLISHED",
              targetType: "course",
              targetId: "course-1",
              metadataJson: { status: "published" },
              occurredAt: "2026-08-10T08:30:00.000Z",
              actor: {
                id: "admin-1",
                email: "admin.demo@eduai.local",
                fullName: "Quản trị Demo",
              },
            },
            {
              id: "audit-2",
              actorId: "instructor-1",
              action: "SUBMISSION_GRADED",
              targetType: "submission",
              targetId: "submission-1",
              metadataJson: { score: 8, status: "graded" },
              occurredAt: "2026-08-10T08:15:00.000Z",
              actor: {
                id: "instructor-1",
                email: "instructor.demo@eduai.local",
                fullName: "Giảng viên Demo",
              },
            },
          ],
          page: 1,
          pageSize: 25,
          total: 2,
          totalPages: 1,
        },
      }),
    }),
  );
}
