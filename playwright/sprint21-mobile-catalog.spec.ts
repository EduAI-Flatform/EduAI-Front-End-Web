import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile-320", width: 320, height: 800 },
  { name: "mobile-640", width: 640, height: 900 },
  { name: "tablet-768", width: 768, height: 900 },
  { name: "desktop-1024", width: 1024, height: 900 },
  { name: "desktop-1440", width: 1440, height: 900 },
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
  badge: null,
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
    await expect(page.locator(".course-card__price").first()).toBeVisible();
    await expect(page.getByText("Trang 1 trên 2")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Catalog course 10" })).toHaveCount(0);

    const mobileNavigation = page.locator(".app-header__mobile-nav");
    if (viewport.width < 768) {
      await expect(mobileNavigation).toBeVisible();
      await expect(mobileNavigation.locator("a")).toHaveCount(6);
    } else {
      await expect(mobileNavigation).toBeHidden();
    }

    const dimensions = await page.locator("body").evaluate((body) => ({
      clientWidth: body.clientWidth,
      scrollWidth: body.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

    await page.getByRole("button", { name: /^2$/ }).click();
    await expect(page.getByRole("heading", { name: "Catalog course 10" })).toBeVisible();
    await expect(page.locator(".course-card")).toHaveCount(2);
  });
}
