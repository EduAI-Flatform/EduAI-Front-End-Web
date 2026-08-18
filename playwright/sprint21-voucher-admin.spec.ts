import { expect, test } from "@playwright/test";
import { assertNoStitchData, guardRuntime } from "./runtime-guards";

const adminSession = JSON.stringify({
  accessToken: "",
  refreshToken: "",
  tokenType: "Bearer",
  expiresIn: 3600,
  user: {
    id: "sprint21-admin",
    email: "admin@example.com",
    fullName: "Admin Sprint 21",
    status: "active",
    roles: ["platform_admin"],
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-10T08:00:00.000Z",
  },
});

const studentSession = JSON.stringify({
  accessToken: "",
  refreshToken: "",
  tokenType: "Bearer",
  expiresIn: 3600,
  user: {
    id: "sprint21-student",
    email: "student@example.com",
    fullName: "Student Sprint 21",
    status: "active",
    roles: ["student"],
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-10T08:00:00.000Z",
  },
});

for (const viewport of [
  { name: "320", width: 320, height: 800 },
  { name: "1440", width: 1440, height: 1000 },
]) {
  test(`administrator voucher management fits at ${viewport.name}px`, async ({ page }) => {
    await page.addInitScript((session) => {
      window.localStorage.setItem("eduai.auth.session.v1", session);
    }, adminSession);
    await page.route("**/api/v1/admin/vouchers?*", (route) =>
      route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          success: true,
          message: "OK",
          data: { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 },
        }),
      }),
    );

    const runtime = guardRuntime(page);
    await page.setViewportSize(viewport);
    await page.goto("/admin/dashboard/vouchers");

    await expect(page.locator(".admin-voucher-page")).toBeVisible();
    await expect(page.getByRole("button", { name: /voucher/i })).toBeVisible();
    const dimensions = await page.locator("body").evaluate((body) => ({
      clientWidth: body.clientWidth,
      scrollWidth: body.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    await assertNoStitchData(page);
    runtime.assertClean();
  });
}

test("student cannot enter administrator voucher management", async ({ page }) => {
  await page.addInitScript((session) => {
    window.localStorage.setItem("eduai.auth.session.v1", session);
  }, studentSession);

  await page.goto("/admin/dashboard/vouchers");
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.locator(".admin-voucher-page")).toHaveCount(0);
});
