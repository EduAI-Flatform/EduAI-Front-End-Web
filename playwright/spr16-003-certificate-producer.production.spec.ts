import { expect, test } from "@playwright/test";
import { getAuthStatePath } from "./auth-state";

const labels = {
  archiveCourse: new RegExp("L\\u01b0u tr\\u1eef kh\\u00f3a h\\u1ecdc", "i"),
  completeLesson: new RegExp("Ho\\u00e0n th\\u00e0nh b\\u00e0i h\\u1ecdc", "i"),
  createCourse: new RegExp("T\\u1ea1o kh\\u00f3a h\\u1ecdc", "i"),
  createLesson: new RegExp("T\\u1ea1o b\\u00e0i h\\u1ecdc", "i"),
  enroll: new RegExp("\\u0110\\u0103ng k\\u00fd h\\u1ecdc", "i"),
  publishCourse: new RegExp("Xu\\u1ea5t b\\u1ea3n kh\\u00f3a h\\u1ecdc", "i"),
  saveCourse: new RegExp("L\\u01b0u kh\\u00f3a h\\u1ecdc", "i"),
  saveLesson: new RegExp("L\\u01b0u b\\u00e0i h\\u1ecdc", "i"),
  viewCourse: new RegExp("Xem kh\\u00f3a h\\u1ecdc", "i"),
};

test.setTimeout(120_000);

test("creates a certificate notification through the contained completion flow", async ({ browser }) => {
  const suffix = Date.now().toString(36);
  const title = `SSE certificate UAT ${suffix}`;
  const instructorContext = await browser.newContext({
    storageState: getAuthStatePath("instructor", "production"),
  });
  const studentContext = await browser.newContext({
    storageState: getAuthStatePath("student", "production"),
  });
  const instructor = await instructorContext.newPage();
  const student = await studentContext.newPage();
  let courseId: string | undefined;

  try {
    await instructor.goto("/instructor/dashboard/courses", { waitUntil: "domcontentloaded" });
    await instructor.getByRole("button", { name: labels.createCourse }).click();
    const courseForm = instructor.locator(".course-management-form");
    await courseForm.locator('input[type="text"]').first().fill(title);
    await courseForm.locator("textarea").fill("Contained notification verification course.");
    await courseForm.locator("select").nth(2).selectOption("public");
    await courseForm.getByRole("button", { name: labels.saveCourse }).click();

    const courseItem = instructor.locator(".instructor-course-item").filter({ hasText: title });
    await expect(courseItem).toBeVisible();
    const lessonsHref = await courseItem.locator('a[href*="/lessons"]').getAttribute("href");
    expect(lessonsHref).toMatch(/\/courses\/([0-9a-f-]+)\/lessons$/i);
    courseId = lessonsHref!.match(/\/courses\/([0-9a-f-]+)\/lessons$/i)![1];

    await instructor.goto(lessonsHref!, { waitUntil: "domcontentloaded" });
    await instructor.getByRole("button", { name: labels.createLesson }).click();
    const lessonForm = instructor.locator(".lesson-management-form");
    await lessonForm.locator('input[type="text"]').nth(0).fill(`Completion lesson ${suffix}`);
    await lessonForm.locator('input[type="text"]').nth(1).fill(`completion-${suffix}`);
    await lessonForm.locator("select").first().selectOption("article");
    await lessonForm.locator("textarea").fill("Complete this required lesson to issue a certificate.");
    await lessonForm.getByRole("button", { name: labels.saveLesson }).click();
    await expect(instructor.locator(".lesson-management-item")).toContainText(`Completion lesson ${suffix}`);

    await instructor.goto("/instructor/dashboard/courses", { waitUntil: "domcontentloaded" });
    const createdCourse = instructor.locator(".instructor-course-item").filter({ hasText: title });
    await createdCourse.getByRole("button", { name: labels.publishCourse }).click();
    await expect(createdCourse.getByRole("link", { name: labels.viewCourse })).toBeVisible({
      timeout: 15_000,
    });

    await student.goto(`/courses/${courseId}`, { timeout: 15_000, waitUntil: "domcontentloaded" });
    await student
      .locator(".course-detail-enroll")
      .getByRole("button", { name: labels.enroll })
      .click({ timeout: 10_000 });
    await expect(student).toHaveURL(new RegExp(`/learning/${courseId}`), { timeout: 15_000 });
    await student.getByRole("button", { name: labels.completeLesson }).click({ timeout: 10_000 });
    await student.locator(".notification-center__trigger").click({ timeout: 10_000 });
    await expect(student.getByText(`Your certificate for ${title} is ready.`, { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  } finally {
    if (courseId) {
      await instructor.goto("/instructor/dashboard/courses", { waitUntil: "domcontentloaded" });
      const createdCourse = instructor.locator(".instructor-course-item").filter({ hasText: title });
      const archive = createdCourse.getByRole("button", { name: labels.archiveCourse });
      if (await archive.isVisible().catch(() => false)) {
        await archive.click();
        await expect(archive).toHaveCount(0);
      }
    }
    await Promise.all([instructorContext.close(), studentContext.close()]);
  }
});
