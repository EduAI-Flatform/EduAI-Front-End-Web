import { expect, test } from "@playwright/test";
import { assertNoStitchData, guardRuntime } from "./runtime-guards";

const viewports = [
  { name: "320", width: 320, height: 800 },
  { name: "1440", width: 1440, height: 1000 },
];

const targetId = "11111111-1111-4111-8111-111111111111";
const syntheticAdminSession = JSON.stringify({
  accessToken: "",
  refreshToken: "",
  tokenType: "Bearer",
  expiresIn: 3600,
  user: {
    id: "user-admin-moderation-layout",
    email: "admin-layout@example.com",
    fullName: "Quản trị viên Kiểm thử",
    status: "active",
    roles: ["platform_admin"],
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-10T08:00:00.000Z",
  },
});

for (const viewport of viewports) {
  test(`renders administrator moderation at ${viewport.name}px`, async ({
    page,
  }) => {
    await page.addInitScript((session) => {
      window.localStorage.setItem("eduai.auth.session.v1", session);
    }, syntheticAdminSession);
    await installModerationFixture(page);
    const runtime = guardRuntime(page);

    await page.setViewportSize(viewport);
    await page.goto("/admin/dashboard/moderation");

    await expect(
      page.getByRole("heading", { name: "Kiểm duyệt nội dung" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Xem Review target" }).click();
    await expect(
      page.getByRole("heading", { name: "Review target" }),
    ).toBeVisible();
    await expect(page.getByText("Review completed")).toBeVisible();

    const dimensions = await page.locator("body").evaluate((body) => ({
      clientWidth: body.clientWidth,
      scrollWidth: body.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(
      dimensions.clientWidth + 1,
    );

    await assertNoStitchData(page);
    await expect(page).toHaveScreenshot(
      `admin-moderation-${viewport.name}.png`,
      { fullPage: true },
    );
    runtime.assertClean();
  });
}

async function installModerationFixture(
  page: import("@playwright/test").Page,
): Promise<void> {
  const item = {
    id: targetId,
    targetType: "course",
    title: "Review target",
    content:
      "A clear, non-sensitive course description retained for moderation review.",
    owner: {
      id: "22222222-2222-4222-8222-222222222222",
      fullName: "Course Owner",
    },
    moderationStatus: "clear",
    moderationReason: null,
    moderatedAt: null,
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-10T08:00:00.000Z",
  };

  await page.route(`**/api/v1/admin/moderation/course/${targetId}`, (route) =>
    route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: {
          item,
          history: [
            {
              id: "audit-moderation-layout",
              actorId: "admin-layout",
              action: "CONTENT_MODERATION_CHANGED",
              targetType: "course",
              targetId,
              metadataJson: {
                action: "restore",
                previousStatus: "hidden",
                newStatus: "clear",
                reason: "Review completed",
              },
              occurredAt: "2026-08-10T08:00:00.000Z",
              actor: {
                id: "admin-layout",
                email: "admin-layout@example.com",
                fullName: "Platform Admin",
              },
            },
          ],
        },
      }),
    }),
  );
  await page.route("**/api/v1/admin/moderation?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: {
          items: [
            item,
            {
              ...item,
              id: "33333333-3333-4333-8333-333333333333",
              targetType: "community_post",
              title: "Community review target",
              owner: {
                id: "44444444-4444-4444-8444-444444444444",
                fullName: "Community Author",
              },
              moderationStatus: "hidden",
              moderationReason: "Pending owner clarification",
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
