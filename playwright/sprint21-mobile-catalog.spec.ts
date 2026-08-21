import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile-320", width: 320, height: 800 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-412", width: 412, height: 915 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 900 },
  { name: "tablet-820", width: 820, height: 1180 },
  { name: "tablet-1024", width: 1024, height: 1366 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1536", width: 1536, height: 864 },
  { name: "desktop-1920", width: 1920, height: 1080 },
];

const courses = Array.from({ length: 10 }, (_, index) => ({
  id: `course-${index + 1}`,
  title: `Catalog course ${index + 1}`,
  slug: `catalog-course-${index + 1}`,
  description: "A focused learning path.",
  thumbnailUrl: null,
  level: "beginner",
  status: "published",
  visibility: "public",
  badge: index === 0 ? "Nổi bật" : null,
  featuredRank: null,
  price: { amountMinor: 199000, currency: "VND" },
  instructor: {
    id: "instructor-1",
    fullName: "EduAI Instructor",
    avatarUrl: null,
    headline: "AI educator",
  },
  metrics: {
    lessonCount: 4,
    durationMinutes: 60,
    enrollmentCount: 10,
    ratingAverage: 4.5,
    ratingCount: 5,
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}));

for (const viewport of viewports) {
  test(`catalog layout and pagination ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/v1/courses", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: courses,
          message: "",
        }),
      }),
    );

    await page.goto("/courses", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".course-card")).toHaveCount(8);
    await expect(page.locator(".courses-grid")).toHaveCSS("display", "grid");

    const firstRowColumns = await page.locator(".course-card").evaluateAll((cards) => {
      const tops = cards.map((card) => Math.round(card.getBoundingClientRect().top));
      return tops.filter((top) => Math.abs(top - tops[0]) <= 1).length;
    });
    expect(firstRowColumns).toBe(
      viewport.width >= 1024 ? 4 : 2,
    );
    await expect(page.locator(".course-card__price").first()).toBeVisible();
    await expect(page.locator(".course-card__description")).toHaveCount(0);
    await expect(page.locator(".course-card__rating")).toHaveCount(8);
    await expect(page.locator(".course-card__image .course-card__badge")).toHaveCount(1);
    await expect(page.locator(".course-card__body .course-card__badge")).toHaveCount(0);
    await expect(page.locator(".course-card__badge")).toHaveCSS(
      "background-color",
      "rgb(206, 133, 9)",
    );
    await expect(page.locator(".course-card__badge")).toHaveCSS("color", "rgb(61, 36, 10)");
    const courseImageRatio = await page.locator(".course-card__image").first().evaluate((element) => {
      const { height, width } = element.getBoundingClientRect();
      return height / width;
    });
    if (viewport.width > 640) {
      expect(courseImageRatio).toBeCloseTo(5 / 8, 1);
    } else {
      const cardBox = await page.locator(".course-card").first().boundingBox();
      expect(cardBox?.height ?? 0).toBeLessThanOrEqual(324);
      expect(courseImageRatio).toBeCloseTo(3 / 4, 1);
    }
    await expect(page.getByText("Trang 1 trên 2")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Catalog course 10" })).toHaveCount(0);

    const mobileNavigation = page.locator(".app-header__mobile-nav");
    if (viewport.width < 768) {
      await expect(mobileNavigation).toBeVisible();
      await expect(mobileNavigation.locator("a")).toHaveCount(5);
      await expect(mobileNavigation.locator("button")).toHaveCount(1);
      const headerBox = await page.locator(".app-header").boundingBox();
      expect(headerBox?.height ?? 0).toBeLessThanOrEqual(58);
      const mobileNavigationBox = await mobileNavigation.boundingBox();
      expect(mobileNavigationBox?.height ?? 0).toBeLessThanOrEqual(60);
    } else {
      await expect(mobileNavigation).toBeHidden();
    }

    const dimensions = await page.locator("body").evaluate((body) => ({
      clientWidth: body.clientWidth,
      scrollWidth: body.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

    if (viewport.width === 320 || viewport.width === 1440) {
      await expect(page).toHaveScreenshot(
        `course-catalog-refined-${viewport.width}.png`,
        { fullPage: true },
      );
    }

    await page.getByRole("button", { name: /^2$/ }).click();
    await expect(page.getByRole("heading", { name: "Catalog course 10" })).toBeVisible();
    await expect(page.locator(".course-card")).toHaveCount(2);
  });
}
