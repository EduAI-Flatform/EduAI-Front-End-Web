import { expect, test } from "@playwright/test";

test("public core flow supports keyboard-only navigation", async ({ page }) => {
  await page.route("**/api/v1/courses", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [], message: "" }),
    }),
  );

  await page.goto("/");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "Bỏ qua điều hướng" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await page.getByRole("link", { name: "Khóa học", exact: true }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/courses$/);
  await expect(
    page.getByRole("heading", {
      name: "Mở khóa tiềm năng của bạn trong mọi lĩnh vực",
    }),
  ).toBeVisible();
});
