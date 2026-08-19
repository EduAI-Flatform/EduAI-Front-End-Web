import { expect, test } from "@playwright/test";

const courses = [
  {
    id: "course-1",
    title: "Demo course",
    slug: "demo-course",
    description: "A focused learning path.",
    thumbnailUrl: null,
    level: "beginner",
    status: "published",
    visibility: "public",
    badge: null,
    featuredRank: 1,
    price: { amountMinor: 199000, currency: "VND" },
    instructor: { id: "instructor-1", fullName: "EduAI Instructor", avatarUrl: null, headline: "AI educator" },
    metrics: { lessonCount: 4, durationMinutes: 60, enrollmentCount: 10, ratingAverage: 4.5, ratingCount: 5 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

for (const viewport of [
  { width: 320, height: 800 },
  { width: 640, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`home feature entries are compact and linked at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/v1/courses", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: courses, message: "" }),
      }),
    );

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".home-ai-card")).toHaveCount(4);
    await expect(page.locator(".benefit-access__link")).toHaveCount(3);
    await expect(page.locator(".home-certificate a")).toBeVisible();

    const layout = await page.locator(".home-ai-grid").evaluate((element) => {
      const style = getComputedStyle(element);
      return { columns: style.gridTemplateColumns, gap: style.gap };
    });
    expect(layout.columns.split(" ")).toHaveLength(2);

    await expect(page.locator(".home-ai-card").nth(1)).toHaveAttribute("href", "/ai/tools");
    await expect(page.locator(".benefit-access__link").nth(2)).toHaveAttribute(
      "href",
      "/dashboard/tmi",
    );

    const dimensions = await page.locator("body").evaluate((body) => ({
      clientWidth: body.clientWidth,
      scrollWidth: body.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
}
