import { expect, test } from "@playwright/test";
import path from "node:path";

const viewports = [
  { name: "mobile-320", width: 320, height: 800 },
  { name: "desktop-1440", width: 1440, height: 1000 },
];

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const dimensions = await page.locator("body").evaluate((body) => ({
    clientWidth: body.clientWidth,
    scrollWidth: body.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

for (const viewport of viewports) {
  test(`public course price and navigation regression ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/courses", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".course-card").first()).toBeVisible();
    await expect(page.locator(".course-card__price").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const mobileNavigation = page.locator(".app-header__mobile-nav");
    if (viewport.width < 768) {
      await expect(mobileNavigation).toBeVisible();
      await expect(mobileNavigation.locator("a")).toHaveCount(3);
      await expect(
        mobileNavigation.locator("a.app-header__nav-link--active"),
      ).toHaveCount(1);
    } else {
      await expect(mobileNavigation).toBeHidden();
    }
  });
}

test.describe("authenticated responsive navigation regression", () => {
  test.use({
    storageState: path.join(process.cwd(), "playwright", ".auth", "student.json"),
  });

  for (const viewport of viewports) {
    test(`student feature route ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/ai", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".app-header")).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const mobileNavigation = page.locator(".app-header__mobile-nav");
      if (viewport.width < 768) {
        await expect(mobileNavigation).toBeVisible();
        await expect(mobileNavigation.locator("a")).toHaveCount(3);
      } else {
        await expect(mobileNavigation).toBeHidden();
      }
    });
  }
});
