import { expect, test } from "@playwright/test";

const legalPages = [
  { path: "/terms", heading: "Điều khoản sử dụng" },
  { path: "/privacy", heading: "Chính sách bảo mật" },
  { path: "/data-deletion", heading: "Yêu cầu xóa dữ liệu" },
];

const viewportWidths = [320, 375, 390, 412, 768, 1024, 1440];

test.describe("public legal pages", () => {
  test("render meaningful content for logged-out direct navigation", async ({ page }) => {
    for (const legalPage of legalPages) {
      await page.goto(legalPage.path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(legalPage.path + "/?$"));
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
      await expect(page.getByRole("heading", { name: legalPage.heading, level: 1 })).toBeVisible();
      await expect(page.locator("main")).not.toBeEmpty();
      await expect(page.locator("footer")).toBeVisible();
    }
  });

  test("do not overflow horizontally at the supported widths", async ({ browser }) => {
    for (const width of viewportWidths) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();

      for (const legalPage of legalPages) {
        await page.goto(legalPage.path, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: legalPage.heading, level: 1 })).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
      }

      await context.close();
    }
  });
});
