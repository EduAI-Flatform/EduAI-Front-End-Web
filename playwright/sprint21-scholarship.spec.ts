import { expect, test } from "@playwright/test";
import { assertNoStitchData, guardRuntime } from "./runtime-guards";

const session = (role: "platform_admin" | "student") => JSON.stringify({
  accessToken: "", refreshToken: "", tokenType: "Bearer", expiresIn: 3600,
  user: { id: `sprint21-${role}`, email: `${role}@example.com`, fullName: role, status: "active", roles: [role], createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" },
});

for (const viewport of [{ name: "320", width: 320, height: 800 }, { name: "1440", width: 1440, height: 1000 }]) {
  test(`admin scholarship management fits at ${viewport.name}px`, async ({ page }) => {
    await page.addInitScript((value) => window.localStorage.setItem("eduai.auth.session.v1", value), session("platform_admin"));
    await page.route("**/api/v1/admin/scholarships?*", (route) => route.fulfill({ contentType: "application/json", status: 200, body: JSON.stringify({ success: true, message: "OK", data: { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 } }) }));
    const runtime = guardRuntime(page); await page.setViewportSize(viewport); await page.goto("/admin/dashboard/scholarships");
    await expect(page.locator(".admin-scholarship-page")).toBeVisible();
    const dimensions = await page.locator("body").evaluate((body) => ({ clientWidth: body.clientWidth, scrollWidth: body.scrollWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1); await assertNoStitchData(page); runtime.assertClean();
  });

  test(`learner scholarship apply state works at ${viewport.name}px`, async ({ page }) => {
    await installLearnerFixture(page); const runtime = guardRuntime(page); await page.setViewportSize(viewport); await page.goto("/courses/course-scholarship-fixture");
    const section = page.locator(".course-detail-enroll__scholarships"); await expect(section).toBeVisible(); await expect(section).toContainText("Merit Grant");
    await section.getByRole("button", { name: "Đăng ký" }).click(); await expect(section.getByRole("button", { name: "Đã đăng ký" })).toBeVisible();
    await assertNoStitchData(page); runtime.assertClean();
  });
}

test("student cannot enter admin scholarship management", async ({ page }) => {
  await page.addInitScript((value) => window.localStorage.setItem("eduai.auth.session.v1", value), session("student"));
  await page.goto("/admin/dashboard/scholarships"); await expect(page).toHaveURL(/\/dashboard\/?$/); await expect(page.locator(".admin-scholarship-page")).toHaveCount(0);
});

async function installLearnerFixture(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript((value) => window.localStorage.setItem("eduai.auth.session.v1", value), session("student"));
  const course = { id: "course-scholarship-fixture", title: "Scholarship Course", slug: "scholarship-course", description: "Course fixture", thumbnailUrl: null, level: "beginner", status: "published", visibility: "public", badge: null, featuredRank: null, price: { amountMinor: 1499000, currency: "VND" }, instructor: { id: "instructor-1", fullName: "Instructor", avatarUrl: null, headline: "Educator", bio: null }, metrics: { lessonCount: 0, durationMinutes: 0, enrollmentCount: 0, ratingAverage: null, ratingCount: 0 }, lessonCount: 0, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" };
  const json = (data: unknown) => ({ contentType: "application/json", status: 200, body: JSON.stringify({ success: true, message: "OK", data }) });
  await page.route("**/api/v1/courses/course-scholarship-fixture", (route) => route.fulfill(json(course)));
  await page.route("**/api/v1/courses/course-scholarship-fixture/lessons", (route) => route.fulfill(json([])));
  await page.route("**/api/v1/courses", (route) => route.fulfill(json([])));
  await page.route("**/api/v1/courses?*", (route) => route.fulfill(json([])));
  await page.route("**/api/v1/me/enrollments", (route) => route.fulfill(json([])));
  await page.route("**/api/v1/scholarships?courseId=course-scholarship-fixture", (route) => route.fulfill(json([{ id: "scholarship-1", title: "Merit Grant", description: "Grant", status: "active", applicationMode: "application", benefitKind: "course_access", benefitValue: 1, currency: null, startsAt: "2026-08-01T00:00:00.000Z", endsAt: "2026-09-01T00:00:00.000Z", quota: 10, awardedCount: 0, courseIds: [course.id], categorySlugs: [], eligibleUserIds: [], createdById: "admin", createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" }])));
  await page.route("**/api/v1/scholarships/scholarship-1/applications", (route) => route.fulfill(json({ id: "application-1", scholarshipId: "scholarship-1", userId: "student", courseId: course.id, status: "awarded", decisionReason: null, appliedAt: "2026-08-18T00:00:00.000Z", updatedAt: "2026-08-18T00:00:00.000Z", idempotent: false, award: { id: "award-1", benefitKind: "course_access", benefitValue: 1, currency: null, awardedAt: "2026-08-18T00:00:00.000Z", revokedAt: null } })));
}
