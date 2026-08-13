import { expect, test } from "@playwright/test";
import { getAuthStatePath } from "./auth-state";

test.describe("notification center", () => {
  test.use({ storageState: getAuthStatePath("student") });

  test("opens from the keyboard, renders API data, and closes with Escape on mobile", async ({
    page,
  }) => {
    await stubNotificationApi(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    const bell = page.getByRole("button", { name: "Thông báo" });
    await bell.focus();
    await page.keyboard.press("Enter");

    const panel = page.getByRole("dialog", { name: "Thông báo" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("New course material")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect(
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).resolves.toBe(true);

    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  });
});

async function stubNotificationApi(page: import("@playwright/test").Page): Promise<void> {
  await page.route("**/api/v1/notifications/unread-count", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ success: true, data: { unreadCount: 1 }, message: "OK" }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/v1/notifications?page=1&pageSize=25", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        success: true,
        data: {
          items: [
            {
              body: "A supported destination was not provided.",
              category: "system",
              createdAt: "2026-08-13T00:00:00.000Z",
              id: "13aa8a9b-8fe5-4ec0-9ac8-b6f2a2ad29aa",
              isRead: false,
              link: null,
              readAt: null,
              title: "New course material",
              type: "course_updated",
            },
          ],
          page: 1,
          pageSize: 25,
          total: 1,
          totalPages: 1,
        },
        message: "OK",
      }),
      contentType: "application/json",
    });
  });
}
