import { expect, test } from "@playwright/test";
import path from "node:path";
import {
  assertNoStitchData,
  expectUuid,
  guardRuntime,
} from "./runtime-guards";

test.describe("public routes", () => {
  test("renders seeded course list and detail through real API responses", async ({
    page,
  }) => {
    const runtime = guardRuntime(page);
    const coursesResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/courses") &&
        response.request().method() === "GET" &&
        !/\/courses\/[^/?]+/.test(response.url()),
    );

    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "Tất cả khóa học" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    const payload = (await (await coursesResponse).json()) as {
      data: Array<{ id: string; title: string }>;
    };
    expect(payload.data.length).toBeGreaterThan(0);
    expectUuid(payload.data[0].id);
    await expect(page.getByText(payload.data[0].title).first()).toBeVisible();

    await page.goto(`/courses/${payload.data[0].id}`);
    await expect(
      page.getByRole("heading", { name: payload.data[0].title }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await assertNoStitchData(page);
    runtime.assertClean();
  });

  for (const route of ["/", "/community", "/verify", "/login", "/register"]) {
    test(`smoke ${route}`, async ({ page }) => {
      const runtime = guardRuntime(page);
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("main, .home-page, .community-page").first()).toBeVisible();
      await assertNoStitchData(page);
      runtime.assertClean();
    });
  }
});

test.describe("student routes", () => {
  test.use({
    storageState: path.join(process.cwd(), "playwright", ".auth", "student.json"),
  });

  const routes = [
    "/dashboard",
    "/dashboard/learning",
    "/dashboard/classrooms",
    "/dashboard/library",
    "/dashboard/community",
    "/dashboard/certificates",
    "/dashboard/ai",
    "/dashboard/ai/tools",
    "/dashboard/profile",
    "/certificates",
    "/library",
    "/ai",
    "/ai/tools",
    "/profile",
  ];

  for (const route of routes) {
    test(`smoke ${route}`, async ({ page }) => {
      const runtime = guardRuntime(page);
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("main").first()).toBeVisible();
      await assertNoStitchData(page);
      runtime.assertClean();
    });
  }

  test("dashboard response and DOM contain the same seeded course", async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/v1/me/dashboard"),
    );
    await page.goto("/dashboard");
    const payload = (await (await responsePromise).json()) as {
      data: {
        activeCourses: Array<{ course: { id: string; title: string } }>;
      };
    };
    expect(payload.data.activeCourses.length).toBeGreaterThan(0);
    expectUuid(payload.data.activeCourses[0].course.id);
    await expect(
      page.getByText(payload.data.activeCourses[0].course.title).first(),
    ).toBeVisible();
  });

  test("smoke dynamic learning, quiz, assignment and classroom routes", async ({
    page,
  }) => {
    const runtime = guardRuntime(page);
    const quizLearningPath = await findLearningPathWith(
      page,
      'a[href^="/quizzes/"]',
    );
    const learningPathResponse = page.waitForResponse((response) =>
      response.url().includes("/api/v1/courses/") &&
      response.url().endsWith("/learning-path"),
    );
    await page.goto(quizLearningPath);
    const learningPathPayload = (await (await learningPathResponse).json()) as {
      data: { progressPercent: number; totalSteps: number };
    };
    expect(learningPathPayload.data.totalSteps).toBeGreaterThan(0);
    await expect(page.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      String(learningPathPayload.data.progressPercent),
    );
    await page.locator('a[href^="/quizzes/"]').first().click();
    await expect(page.locator(".quiz-attempt-page")).toBeVisible();
    await page.waitForLoadState("domcontentloaded");

    const assignmentLearningPath = await findLearningPathWith(
      page,
      'a[href^="/assignments/"]',
    );
    await page.goto(assignmentLearningPath);
    await page.locator('a[href^="/assignments/"]').first().click();
    await expect(page.locator(".assignment-submission-page")).toBeVisible();
    await page.waitForLoadState("domcontentloaded");

    await page.goto("/dashboard/classrooms");
    await page.waitForLoadState("domcontentloaded");
    const classroomLink = page.locator('a[href^="/classroom-sessions/"]').first();
    await expect(classroomLink).toBeVisible();
    await classroomLink.click();
    await expect(page.locator(".classroom-join")).toBeVisible();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("button", { name: "Vào lớp", exact: true })).toBeVisible();
    await expect(page.getByText(/phê duyệt/i)).toHaveCount(0);

    await assertNoStitchData(page);
    runtime.assertClean();
  });
});

test.describe("instructor routes", () => {
  test.use({
    storageState: path.join(
      process.cwd(),
      "playwright",
      ".auth",
      "instructor.json",
    ),
  });

  for (const route of [
    "/instructor/dashboard",
    "/instructor/dashboard/courses",
    "/instructor/dashboard/classrooms",
    "/instructor/dashboard/assignments",
    "/instructor/dashboard/library",
    "/instructor/dashboard/library/upload",
    "/instructor/dashboard/ai",
  ]) {
    test(`smoke ${route}`, async ({ page }) => {
      const runtime = guardRuntime(page);
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("main").first()).toBeVisible();
      await assertNoStitchData(page);
      runtime.assertClean();
    });
  }

  test("dashboard uses aggregate instructor response", async ({ page }) => {
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/v1/instructor/dashboard"),
    );
    await page.goto("/instructor/dashboard");
    const payload = (await (await responsePromise).json()) as {
      data: { statistics: { publishedCourses: number } };
    };
    expect(payload.data.statistics.publishedCourses).toBeGreaterThan(0);
    await expect(
      page.getByText(String(payload.data.statistics.publishedCourses)).first(),
    ).toBeVisible();
  });

  test("smoke dynamic instructor course management routes", async ({ page }) => {
    const runtime = guardRuntime(page);
    await page.goto("/instructor/dashboard/courses");
    await page.waitForLoadState("networkidle");

    for (const segment of ["lessons", "quizzes", "assignments"]) {
      const link = page.locator(`a[href$="/${segment}"]`).first();
      await expect(link).toBeVisible();
      const href = await link.getAttribute("href");
      expect(href).toBeTruthy();
      await page.goto(href!);
      await expect(page.locator("main").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      await page.goto("/instructor/dashboard/courses");
      await page.waitForLoadState("networkidle");
    }

    await assertNoStitchData(page);
    runtime.assertClean();
  });
});

async function findLearningPathWith(
  page: import("@playwright/test").Page,
  childSelector: string,
): Promise<string> {
  await page.goto("/dashboard/learning");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator('a[href^="/learning/"]').first()).toBeVisible();
  const learningLinks = await page.locator('a[href^="/learning/"]').all();
  const paths = (
    await Promise.all(learningLinks.map((link) => link.getAttribute("href")))
  ).filter((href): href is string => Boolean(href));

  for (const learningPath of [...new Set(paths)]) {
    await page.goto(learningPath);
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator('main.learning-page:not([aria-busy="true"])'),
    ).toBeVisible();

    if ((await page.locator(childSelector).count()) > 0) {
      return learningPath;
    }
  }

  throw new Error(`No seeded learning route contains ${childSelector}`);
}
