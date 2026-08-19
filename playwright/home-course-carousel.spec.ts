import { expect, test } from "@playwright/test";

const courses = Array.from({ length: 6 }, (_, index) => ({
  id: `home-course-${index + 1}`,
  title: `Home course ${index + 1}`,
  slug: `home-course-${index + 1}`,
  description: "A focused learning path.",
  thumbnailUrl: null,
  level: "beginner",
  status: "published",
  visibility: "public",
  badge: null,
  featuredRank: index + 1,
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

for (const viewport of [
  { name: "mobile-320", width: 320, height: 800 },
  { name: "desktop-1024", width: 1024, height: 900 },
]) {
  test(`featured course carousel ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/v1/courses", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: courses, message: "" }),
      }),
    );

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".home-course-card")).toHaveCount(6);
    await expect(page.getByRole("link", { name: /Xem tất cả/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Khóa học tiếp theo/i })).toBeVisible();

    const carousel = page.locator(".home-course-grid");
    const layout = await carousel.evaluate((element) => {
      const firstCard = element.querySelector<HTMLElement>(".home-course-card");
      const style = getComputedStyle(element);
      return {
        cardWidth: firstCard?.getBoundingClientRect().width ?? 0,
        carouselWidth: element.getBoundingClientRect().width,
        overflowX: style.overflowX,
      };
    });
    const expectedVisibleCards = viewport.width < 768 ? 2 : 3;
    expect(layout.cardWidth / layout.carouselWidth).toBeGreaterThan(
      1 / expectedVisibleCards - 0.03,
    );
    expect(layout.cardWidth / layout.carouselWidth).toBeLessThan(
      1 / expectedVisibleCards + 0.03,
    );
    expect(layout.overflowX).toBe("auto");

    await page.getByRole("button", { name: /Khóa học tiếp theo/i }).click();
    await page.waitForTimeout(350);
    expect(await carousel.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  });
}
