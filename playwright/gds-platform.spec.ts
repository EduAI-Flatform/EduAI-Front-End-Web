import { expect, test } from "@playwright/test";
import { DEFAULT_PLATFORM_SETTINGS } from "../src/features/platform/platform.defaults";
const widths = [320, 375, 390, 412, 768, 1024, 1440];
test("admin can draft, preview, approve and schedule branding in VI and EN", async ({
  page,
}) => {
  const settings = structuredClone(DEFAULT_PLATFORM_SETTINGS);
  const revisions: any[] = [];
  let pointReady = true;
  await page.addInitScript(() =>
    localStorage.setItem(
      "eduai.auth.session.v1",
      JSON.stringify({
        accessToken: "synthetic-admin-access",
        refreshToken: "synthetic-admin-refresh",
        expiresIn: 900,
        tokenType: "Bearer",
        user: {
          id: "10000000-0000-4000-8000-000000000001",
          email: "admin@example.test",
          fullName: "GDS Admin",
          status: "active",
          roles: ["platform_admin"],
        },
      }),
    ),
  );
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname.replace("/api/v1", "");
    let data: unknown;
    if (path === "/platform/settings") data = { settings };
    else if (path === "/admin/platform/settings")
      data = {
        settings,
        revisions,
        versions: {},
        groups: Object.keys(settings),
        pointCapabilities: { supportedEvents: ['course.completed'], historicalAwardsPreserved: true,
          reprocessesHistoricalEvents: false, impactWindowDays: 30, activationReady: pointReady,
          activationBlocker: pointReady ? null : 'POINT_SCHEMA_NOT_VERIFIED' },
      };
    else if (
      path === "/admin/platform/revisions" &&
      request.method() === "POST"
    ) {
      const input = request.postDataJSON();
      data = {
        ...input,
        // Persisted JSONB may reorder object keys; array order is meaningful.
        content: Array.isArray(input.content) ? input.content : Object.fromEntries(Object.entries(input.content).reverse()),
        id: "20000000-0000-4000-8000-000000000001",
        version: 1,
        status: "draft",
        createdById: "admin",
        createdAt: new Date().toISOString(),
        approvedById: null,
        effectiveAt: null,
      };
      revisions.unshift(data);
    } else if (path.endsWith("/preview")) {
      data = {
        revisionId: revisions[0].id,
        group: revisions[0].group,
        version: 1,
        changed: true,
        before: settings.branding,
        after: revisions[0].content,
        canSchedule: true,
        blockers: [],
        preservesPurchasedAccess: true,
        membershipImpact: revisions[0].group === 'membership' ? {
          status: 'evaluated', reason: null, policyRevisionId: revisions[0].id,
          evaluatedUsers: 1, totalUsers: 1, projectedChangesOnPage: 0, projectedBenefitChangesOnPage: 1,
          nextCursor: null, complete: true, items: [{ userId: 'synthetic-user', previousTierCode: 'member',
            projectedBenefitsChanged: true, previousBenefits: [{ vi: 'Quyền lợi cũ', en: 'Previous benefit' }],
            evaluation: { basis: 'topup', status: 'evaluated', currency: 'VND', qualifyingAmountMinor: '100000',
              tier: { code: 'member', name: { vi: 'Thẻ thành viên', en: 'Member' },
                benefits: [{ vi: 'Quyền lợi mới', en: 'New benefit' }] } } }],
        } : null,
        pointsImpact: revisions[0].group === 'points' ? {
          status: 'evaluated', simulationOnly: true, historicalAwardsPreserved: true, reprocessesHistoricalEvents: false,
          windowStart: '2026-10-13T12:00:00Z', windowEnd: '2026-11-12T12:00:00Z', sampleLimit: 5000,
          sampledEvents: 3, sampledLearners: 2, affectedLearners: 1, changedEvents: 1, beforePoints: 180, afterPoints: 200,
          beforeRevisionId: '10000000-0000-4000-8000-000000000001', afterRevisionId: revisions[0].id,
        } : null,
      };
    } else if (path.endsWith("/approve")) {
      revisions[0].status = "approved";
      data = revisions[0];
    } else if (path.endsWith("/schedule")) {
      revisions[0].status = "scheduled";
      revisions[0].effectiveAt = request.postDataJSON().effectiveAt;
      data = revisions[0];
    } else data = { items: [], unreadCount: 0 };
    await route.fulfill({ json: { success: true, data, message: "ok" } });
  });
  await page.goto("/admin/dashboard/membership");
  await expect(page).toHaveURL(/\/admin\/dashboard\/platform-settings\?group=membership$/);
  await page.goto("/admin/dashboard/platform-settings");
  await expect(
    page.getByRole("heading", { name: "Cấu hình nền tảng", exact: true }),
  ).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByLabel("Tên", { exact: true }).fill("GDS Education");
  await page
    .getByRole("button", { name: "Lưu bản nháp mới", exact: true })
    .click();
  await expect(
    page.getByText("Đã lưu bản nháp.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xem trước ảnh hưởng", exact: true })
    .click();
  await expect(
    page.getByText("Quyền học đã mua được giữ nguyên.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Duyệt bản nháp", exact: true })
    .click();
  await page
    .getByLabel("Ngày giờ hiệu lực", { exact: true })
    .fill("2099-11-11T08:00");
  await page
    .getByRole("button", { name: "Đặt lịch áp dụng", exact: true })
    .click();
  await expect(
    page.getByText("Đã đặt ngày hiệu lực.", { exact: true }),
  ).toBeVisible();
  await page.getByRole('combobox', { name: /^Nhóm cấu hình/ }).selectOption('membership');
  await page.getByRole('combobox', { name: /^Cơ sở xét hạng/ }).selectOption('topup');
  await page.getByRole('button', { name: 'Lưu bản nháp mới', exact: true }).click();
  await page.getByRole('button', { name: 'Xem trước ảnh hưởng', exact: true }).click();
  await expect(page.getByText('Nạp tiền đủ điều kiện 100000 VND', { exact: true })).toBeVisible();
  await expect(page.getByText('Quyền lợi trước: Quyền lợi cũ', { exact: true })).toBeVisible();
  await expect(page.getByText('Quyền lợi sau: Quyền lợi mới', { exact: true })).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390 || width === 1440) await page.locator('.platform-impact').screenshot({ path: test.info().outputPath(`membership-impact-${width}.png`) });
  }
  await page.getByRole('combobox', { name: /^Nhóm cấu hình/ }).selectOption('points');
  await expect(page.getByText(/Hạ tầng điểm đã được xác minh/)).toBeVisible();
  await page.getByRole('button', { name: '+ Thêm mục', exact: true }).click();
  await page.getByRole('combobox', { name: 'Mã hoạt động', exact: true }).selectOption('course.completed');
  await page.getByRole('spinbutton', { name: 'Số điểm', exact: true }).fill('80');
  await page.getByRole('button', { name: 'Lưu bản nháp mới', exact: true }).click();
  await page.getByRole('button', { name: 'Xem trước ảnh hưởng', exact: true }).click();
  await expect(page.getByText('Điểm theo bản nháp: 200', { exact: true })).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390 || width === 1440) await page.locator('.platform-impact').screenshot({ path: test.info().outputPath(`point-impact-vi-${width}.png`) });
  }
  await page.evaluate(() => localStorage.setItem('gds.locale.v1', 'en'));
  await page.reload();
  await page.getByRole('combobox', { name: 'Configuration group', exact: true }).selectOption('points');
  await expect(page.getByText(/Point infrastructure is verified/)).toBeVisible();
  await page.getByRole('button', { name: /^v1/ }).first().click();
  await page.getByRole('button', { name: 'Preview impact', exact: true }).click();
  await expect(page.getByText('Points under draft policy: 200', { exact: true })).toBeVisible();
  await expect(page.getByText(/Historical awards are not recalculated/)).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  pointReady = false;
  await page.reload();
  await page.getByRole('combobox', { name: 'Configuration group', exact: true }).selectOption('points');
  await expect(page.getByText(/Point infrastructure is not verified for activation/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save new draft', exact: true })).toBeEnabled();
});
test("public GDS hero and activities fit all required widths with working locale", async ({
  page,
}) => {
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({
      json: {
        success: true,
        data: path.endsWith("/platform/settings")
          ? { settings: DEFAULT_PLATFORM_SETTINGS }
          : [],
        message: "ok",
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "GDS - LEARN WITHOUT LIMITS",
  );
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".home-hero__artwork img")).toHaveAttribute(
      "src",
      "/gds-hero.webp",
    );
  }
  await page.getByLabel("Ngôn ngữ").selectOption("en");
  await expect(
    page.getByRole("link", { name: "Start learning", exact: true }),
  ).toBeVisible();
  await page.goto("/activities");
  await expect(
    page.getByRole("heading", { name: "Activities", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No activities have been published"),
  ).toBeVisible();
  await page.goto('/partners');
  await expect(page.getByText(/You do not need an API or your own system to apply/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit application', exact: true })).toBeDisabled();
  await page.getByLabel('Language').selectOption('vi');
  await expect(page.getByText(/Chưa cần có API hoặc hệ thống riêng để đăng ký/)).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
