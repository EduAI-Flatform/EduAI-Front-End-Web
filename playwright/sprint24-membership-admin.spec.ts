import { expect, test } from "@playwright/test";
import { assertNoStitchData, guardRuntime } from "./runtime-guards";

const session = (role: "platform_admin" | "student") => JSON.stringify({
  accessToken: "", refreshToken: "", tokenType: "Bearer", expiresIn: 3600,
  user: { id: `membership-${role}`, email: `${role}@example.com`, fullName: role === "platform_admin" ? "Quản trị viên Hội viên" : "Học viên", status: "active", roles: [role], createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T00:00:00.000Z" },
});

for (const viewport of [{ name: "320", width: 320, height: 800 }, { name: "1440", width: 1440, height: 1000 }]) {
  test(`membership plan review remains usable at ${viewport.name}px`, async ({ page }) => {
    await page.addInitScript((value) => window.localStorage.setItem("eduai.auth.session.v1", value), session("platform_admin"));
    await installFixtures(page);
    const runtime = guardRuntime(page);
    await page.setViewportSize(viewport);
    await page.goto("/admin/dashboard/membership");
    await expect(page.getByRole("heading", { level: 1, name: "Gói hội viên" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Hội viên Vàng dành cho hành trình/ })).toBeVisible();
    await expect(page.getByText(/mức giảm từ 50% trở lên/i)).toBeVisible();
    await expect(page.getByText(/100\.000 VND → 150\.000 VND/)).toBeVisible();
    const dimensions = await page.locator("body").evaluate((body) => ({ clientWidth: body.clientWidth, scrollWidth: body.scrollWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    await assertNoStitchData(page);
    runtime.assertClean();
  });
}

test("student cannot enter membership administration", async ({ page }) => {
  await page.addInitScript((value) => window.localStorage.setItem("eduai.auth.session.v1", value), session("student"));
  await page.goto("/admin/dashboard/membership");
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.locator(".admin-membership-page")).toHaveCount(0);
});

async function installFixtures(page: import("@playwright/test").Page) {
  const json = (data: unknown) => ({ contentType: "application/json", status: 200, body: JSON.stringify({ success: true, message: "OK", data }) });
  const version = (id: string, versionNumber: number, status: string, price: string, discount: number, name: string) => ({ id, planId: "plan-gold", versionNumber, displayName: name, description: "Điều khoản hội viên tiếng Việt rất dài vẫn phải hiển thị rõ ràng trên màn hình nhỏ.", baseMonthlyPriceAmountMinor: price, currency: "VND", salesStartAt: null, salesEndAt: null, status, createdAt: "2026-08-24T00:00:00.000Z", publishedAt: status === "PUBLISHED" ? "2026-08-24T00:10:00.000Z" : null, archivedAt: null, durationOptions: [{ id: `duration-${id}`, months: 12, pricingMode: "DISCOUNT", priceAmountMinor: null, discountPercent: discount, effectivePriceAmountMinor: discount === 60 ? "720000" : "1080000", currency: "VND", displayOrder: 0 }], serviceEntitlements: [], includedCourses: [] });
  await page.route("**/api/v1/admin/membership/plans?*", (route) => route.fulfill(json({ items: [{ id: "plan-gold", code: "GOLD", status: "ACTIVE", createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T01:00:00.000Z", archivedAt: null, versions: [version("v2", 2, "DRAFT", "150000", 60, "Hội viên Vàng dành cho hành trình học tập chuyên sâu"), version("v1", 1, "PUBLISHED", "100000", 10, "Hội viên Vàng")] }], page: 1, pageSize: 20, total: 1, totalPages: 1 })));
  await page.route("**/api/v1/admin/membership/service-entitlements?*", (route) => route.fulfill(json({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 0 })));
  await page.route("**/api/v1/admin/membership/available-courses?*", (route) => route.fulfill(json({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 0 })));
}
