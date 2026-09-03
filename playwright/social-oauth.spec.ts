import { expect, test } from "@playwright/test";

const enabledCapabilities = {
  success: true,
  data: { google: true, facebook: true, zalo: true },
  message: "OK",
};

test.use({ serviceWorkers: "block" });

test.describe("social OAuth", () => {
  test("renders enabled providers accessibly without mobile overflow", async ({
    page,
  }) => {
    await page.route("**/auth/oauth/providers", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(enabledCapabilities),
      });
    });

    for (const viewport of [
      { width: 320, height: 800 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/login");

      await expect(
        page.getByRole("button", { name: "Tiếp tục với Facebook" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Tiếp tục với Zalo" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Tiếp tục với Facebook" }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Tiếp tục với Zalo" }),
      ).toBeEnabled();

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  });

  test("renders a safe callback error without exchanging a ticket", async ({
    page,
  }) => {
    let exchangeRequests = 0;
    await page.route("**/auth/oauth/exchange", async (route) => {
      exchangeRequests += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false }),
      });
    });

    await page.goto("/auth/callback?error=OAUTH_CALLBACK_FAILED");

    await expect(page.getByRole("alert")).toContainText(
      "Không thể hoàn tất đăng nhập. Vui lòng thử lại.",
    );
    await expect(
      page.getByRole("link", { name: "Quay lại đăng nhập" }),
    ).toBeVisible();
    expect(exchangeRequests).toBe(0);
  });
});
