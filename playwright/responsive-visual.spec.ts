import { expect, test } from "@playwright/test";
import path from "node:path";
import { assertNoStitchData, guardRuntime } from "./runtime-guards";

const viewports = [
  { name: "320", width: 320, height: 800 },
  { name: "768", width: 768, height: 900 },
  { name: "1024", width: 1024, height: 900 },
  { name: "1440", width: 1440, height: 1000 },
];
const cnsDeveloperCredit =
  "Phát triển bởi Trung tâm an ninh công nghệ số - CNS";

for (const viewport of viewports) {
  test(`public course list fits ${viewport.name}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "Tất cả khóa học" })).toBeVisible();
    const credit = page.getByRole("group", { name: "Đơn vị phát triển" });
    const logo = credit.locator("img");
    await expect(credit).toContainText(cnsDeveloperCredit);
    await expect(logo).toHaveAttribute("src", "/cns-logo.png");
    await expect(logo).toHaveAttribute("alt", "");
    await expect(logo).toHaveAttribute("width", "48");
    await expect(logo).toHaveAttribute("height", "48");
    expect(
      await logo.evaluate(
        (image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
      ),
    ).toBe(true);
    const dimensions = await page.locator("body").evaluate((body) => ({
      clientWidth: body.clientWidth,
      scrollWidth: body.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
}

test.describe("public visual baselines", () => {
  for (const viewport of [viewports[0], viewports[3]]) {
    for (const pageCase of [
      { name: "home", path: "/", heading: "Nền tảng học tập AI thế hệ mới" },
      { name: "courses", path: "/courses", heading: "Tất cả khóa học" },
    ]) {
      test(`${pageCase.name} ${viewport.name}`, async ({ page }) => {
        const runtime = guardRuntime(page);
        await page.setViewportSize(viewport);
        await page.goto(pageCase.path);
        await expect(
          page.getByRole("heading", { name: pageCase.heading }),
        ).toBeVisible();
        if (pageCase.name === "home") {
          await expect(page.locator(".home-course-card.course-card").first()).toBeVisible();
        }
        await page.waitForLoadState("networkidle");
        await assertNoStitchData(page);
        await expect(page).toHaveScreenshot(
          `${pageCase.name}-${viewport.name}.png`,
          { fullPage: true },
        );
        runtime.assertClean();
      });
    }

    test(`course-detail ${viewport.name}`, async ({ page }) => {
      const runtime = guardRuntime(page);
      await page.setViewportSize(viewport);
      await page.goto("/courses");
      const firstCourse = page.locator(".course-card__link").first();
      await expect(firstCourse).toBeVisible();
      await firstCourse.click();
      await expect(page.locator(".course-detail-page h1")).toBeVisible();
      await page.waitForLoadState("networkidle");
      await assertNoStitchData(page);
      await expect(page).toHaveScreenshot(
        `course-detail-${viewport.name}.png`,
        { fullPage: true },
      );
      runtime.assertClean();
    });
  }
});

test.describe("authenticated visual baselines", () => {
  test.use({
    storageState: path.join(process.cwd(), "playwright", ".auth", "student.json"),
  });

  for (const viewport of [viewports[0], viewports[3]]) {
    for (const pageCase of [
      {
        name: "student-dashboard",
        path: "/dashboard",
        readySelector: ".student-dashboard__hero h1",
      },
      {
        name: "student-profile",
        path: "/dashboard/profile",
        readySelector: ".student-profile-page",
      },
    ]) {
      test(`${pageCase.name} ${viewport.name}`, async ({ page }) => {
        const runtime = guardRuntime(page);
        await page.setViewportSize(viewport);
        await page.goto(pageCase.path);
        await expect(page.locator(pageCase.readySelector).first()).toBeVisible();
        await page.waitForLoadState("networkidle");
        await assertNoStitchData(page);
        await expect(page).toHaveScreenshot(
          `${pageCase.name}-${viewport.name}.png`,
          { fullPage: true },
        );
        runtime.assertClean();
      });
    }
  }
});

test.describe("instructor visual baselines", () => {
  test.use({
    storageState: path.join(
      process.cwd(),
      "playwright",
      ".auth",
      "instructor.json",
    ),
  });

  for (const viewport of [viewports[0], viewports[3]]) {
    test(`instructor-dashboard ${viewport.name}`, async ({ page }) => {
      const runtime = guardRuntime(page);
      await page.setViewportSize(viewport);
      await page.goto("/instructor/dashboard");
      await expect(
        page.getByRole("heading", { name: /hôm nay lớp học đang chờ bạn/i }),
      ).toBeVisible();
      await page.waitForLoadState("networkidle");
      await assertNoStitchData(page);
      await expect(page).toHaveScreenshot(
        `instructor-dashboard-${viewport.name}.png`,
        { fullPage: true },
      );
      runtime.assertClean();
    });
  }
});
