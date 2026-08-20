import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((session) => {
    window.localStorage.setItem("eduai.auth.session.v1", JSON.stringify(session));
  }, {
    accessToken: "local-learning-path-test-token",
    refreshToken: "local-learning-path-test-refresh",
    tokenType: "Bearer",
    expiresIn: 3600,
    user: {
      id: "local-learning-path-student",
      email: "student.test@local.invalid",
      fullName: "Học viên kiểm thử",
      status: "active",
      roles: ["student"],
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-08-20T00:00:00.000Z",
    },
  });
  await page.route("**/api/v1/notifications/unread-count", (route) =>
    route.fulfill(json({ unreadCount: 0 })),
  );
});

const currentPath = {
  id: "path-browser",
  version: 3,
  createdAt: "2026-08-20T00:00:00.000Z",
  path: {
    schemaVersion: "v1",
    milestones: [
      {
        courseId: "course-browser",
        reason: "Bắt đầu từ kiến thức nền tảng.",
        priority: 1,
        available: true,
        course: {
          id: "course-browser",
          title: "Nhập môn AI",
          slug: "nhap-mon-ai",
          thumbnailUrl: null,
          level: "beginner",
          progressPercent: 35,
          enrollmentStatus: "active",
        },
      },
      {
        courseId: "course-unavailable",
        reason: "Khuyến nghị cũ cần được thay thế.",
        priority: 2,
        available: false,
        course: null,
      },
    ],
  },
};

for (const viewport of [{ width: 320, height: 760 }, { width: 1440, height: 900 }]) {
  test(`renders an accessible roadmap at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/v1/ai/learning-paths/current", (route) => route.fulfill(json(currentPath)));
    await page.goto("/dashboard/learning-path");

    await expect(page.getByRole("heading", { name: "Lộ trình học tập AI" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Tiến độ Nhập môn AI" })).toHaveAttribute("value", "35");
    await expect(page.getByText("Khuyến nghị không còn khả dụng")).toBeVisible();
    await expect(page.getByText("course-unavailable")).toHaveCount(0);
    const regenerate = page.getByRole("button", { name: "Tạo lại lộ trình" });
    await regenerate.focus();
    await expect(regenerate).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test("shows bounded loading and retryable error states", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/ai/learning-paths/current", async (route) => {
    await pending;
    await route.fulfill(jsonError(503));
  });

  await page.goto("/dashboard/learning-path", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Đang tải lộ trình học tập")).toHaveAttribute("aria-busy", "true");
  release();
  await expect(page.getByRole("heading", { name: "Chưa thể tải lộ trình" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeEnabled();
});

function json(data: unknown) {
  return { contentType: "application/json", status: 200, body: JSON.stringify({ success: true, data, message: "OK" }) };
}

function jsonError(status: number) {
  return { contentType: "application/json", status, body: JSON.stringify({ success: false, error: { code: "TEMPORARY_ERROR", message: "Tạm thời không khả dụng" } }) };
}
