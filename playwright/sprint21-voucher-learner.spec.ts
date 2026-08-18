import { expect, test } from "@playwright/test";
import { assertNoStitchData, guardRuntime } from "./runtime-guards";

const studentSession = JSON.stringify({
  accessToken: "",
  refreshToken: "",
  tokenType: "Bearer",
  expiresIn: 3600,
  user: {
    id: "sprint21-student",
    email: "student@example.com",
    fullName: "Student Sprint 21",
    status: "active",
    roles: ["student"],
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-10T08:00:00.000Z",
  },
});

for (const viewport of [
  { name: "320", width: 320, height: 800 },
  { name: "1440", width: 1440, height: 1000 },
]) {
  test(`learner voucher valid state is server-rendered at ${viewport.name}px`, async ({ page }) => {
    await installCourseFixture(page, "eligible");
    await page.setViewportSize(viewport);
    const runtime = guardRuntime(page);
    await page.goto("/courses/course-voucher-fixture");

    const voucherForm = page.locator(".course-detail-enroll__voucher");
    await expect(voucherForm).toBeVisible();
    await voucherForm.locator("input").fill("EDUAI20");
    await voucherForm.getByRole("button").click();
    await expect(page.locator(".course-detail-enroll__voucher-result")).toContainText("1.299.000");
    await assertNoStitchData(page);
    runtime.assertClean();
  });
}

test("learner voucher invalid state is clear and does not fabricate a total", async ({ page }) => {
  await installCourseFixture(page, "invalid");
  const runtime = guardRuntime(page);
  await page.goto("/courses/course-voucher-fixture");

  const voucherForm = page.locator(".course-detail-enroll__voucher");
  await voucherForm.locator("input").fill("NOT-A-VOUCHER");
  await voucherForm.getByRole("button").click();
  await expect(page.locator(".course-detail-enroll__error")).toBeVisible();
  await expect(page.locator(".course-detail-enroll__voucher-result")).toHaveCount(0);
  await assertNoStitchData(page);
  runtime.assertClean();
});

async function installCourseFixture(
  page: import("@playwright/test").Page,
  voucherMode: "eligible" | "invalid",
): Promise<void> {
  await page.addInitScript((session) => {
    window.localStorage.setItem("eduai.auth.session.v1", session);
  }, studentSession);

  const course = {
    id: "course-voucher-fixture",
    title: "Voucher Contract Course",
    slug: "voucher-contract-course",
    description: "A deterministic learner voucher browser fixture.",
    thumbnailUrl: null,
    level: "beginner",
    status: "published",
    visibility: "public",
    badge: null,
    featuredRank: null,
    price: { amountMinor: 1499000, currency: "VND" },
    instructor: { id: "instructor-1", fullName: "Instructor", avatarUrl: null, headline: "Educator", bio: null },
    metrics: { lessonCount: 0, durationMinutes: 0, enrollmentCount: 0, ratingAverage: null, ratingCount: 0 },
    lessonCount: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
  const json = (data: unknown) => ({
    contentType: "application/json",
    status: 200,
    body: JSON.stringify({ success: true, message: "OK", data }),
  });

  await page.route("**/api/v1/courses/course-voucher-fixture", (route) => route.fulfill(json(course)));
  await page.route("**/api/v1/courses/course-voucher-fixture/lessons", (route) => route.fulfill(json([])));
  await page.route("**/api/v1/courses", (route) => route.fulfill(json([])));
  await page.route("**/api/v1/courses?*", (route) => route.fulfill(json([])));
  await page.route("**/api/v1/me/enrollments", (route) => route.fulfill(json([])));
  await page.route("**/api/v1/courses/course-voucher-fixture/voucher-preview", (route) =>
    route.fulfill(
      json(
        voucherMode === "eligible"
          ? { voucherId: "voucher-1", code: "EDUAI20", currency: "VND", eligible: true, reason: "eligible", discountAmountMinor: 200000, finalAmountMinor: 1299000 }
          : { voucherId: "", code: "NOT-A-VOUCHER", currency: "VND", eligible: false, reason: "code_invalid", discountAmountMinor: 0, finalAmountMinor: 1499000 },
      ),
    ),
  );
}
