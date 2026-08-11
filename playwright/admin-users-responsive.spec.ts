import { expect, test } from "@playwright/test";
import { assertNoStitchData, guardRuntime } from "./runtime-guards";

const viewports = [
  { name: "320", width: 320, height: 800 },
  { name: "1440", width: 1440, height: 1000 },
];

const syntheticAdminSession = JSON.stringify({
  accessToken: "",
  refreshToken: "",
  tokenType: "Bearer",
  expiresIn: 3600,
  user: {
    id: "user-admin-layout",
    email: "admin-layout@example.com",
    fullName: "Quản trị viên Kiểm thử",
    status: "active",
    roles: ["platform_admin"],
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-10T08:00:00.000Z",
  },
});

for (const viewport of viewports) {
  test(`renders administrator user management at ${viewport.name}px`, async ({
    page,
  }) => {
    await page.addInitScript((session) => {
      window.localStorage.setItem("eduai.auth.session.v1", session);
    }, syntheticAdminSession);
    await installUserFixture(page);
    const runtime = guardRuntime(page);

    await page.setViewportSize(viewport);
    await page.goto("/admin/dashboard/users");

    await expect(
      page.getByRole("heading", { name: "Quản lý người dùng" }),
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
    await expect(page).toHaveScreenshot(`admin-users-${viewport.name}.png`, {
      fullPage: true,
    });
    runtime.assertClean();
  });
}

async function installUserFixture(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.route("**/api/v1/admin/users?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: {
          items: [
            {
              id: "user-student-1",
              email: "learner@example.com",
              fullName: "Học viên Minh",
              status: "active",
              authProvider: "local",
              emailVerified: true,
              roles: ["student"],
              createdAt: "2026-08-01T08:00:00.000Z",
              updatedAt: "2026-08-10T08:00:00.000Z",
            },
            {
              id: "user-instructor-1",
              email: "teacher@example.com",
              fullName: "Giảng viên An",
              status: "suspended",
              authProvider: "local",
              emailVerified: true,
              roles: ["instructor"],
              createdAt: "2026-07-15T08:00:00.000Z",
              updatedAt: "2026-08-09T08:00:00.000Z",
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
