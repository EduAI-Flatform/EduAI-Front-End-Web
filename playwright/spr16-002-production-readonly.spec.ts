import { expect, test } from "@playwright/test";
import { getAuthStatePath } from "./auth-state";

const appOrigin = "https://eduai.giaoducso.org.vn";
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

const roles = [
  { name: "student", route: "/dashboard" },
  { name: "instructor", route: "/instructor/dashboard" },
  { name: "administrator", route: "/admin/dashboard" },
] as const;

for (const role of roles) {
  test.describe(`${role.name} notification center production UAT`, () => {
    test.use({ storageState: getAuthStatePath(role.name, "production") });

    test("opens and closes the shared center using read-only production requests", async ({ page }) => {
      const audit = installReadOnlyAudit(page);

      await page.goto(role.route, { waitUntil: "domcontentloaded" });
      const bell = page.getByRole("button", { name: "Thông báo" });
      await expect(bell).toBeVisible();

      await bell.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog", { name: "Thông báo" })).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Thông báo" })).toHaveCount(0);

      audit.assertClean();
    });
  });
}

function installReadOnlyAudit(page: import("@playwright/test").Page) {
  const unsafeRequests: string[] = [];
  const consoleErrors: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === appOrigin && url.pathname.startsWith("/api/") && !safeMethods.has(request.method())) {
      unsafeRequests.push(`${request.method()} ${url.pathname}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.type());
  });

  return {
    assertClean() {
      expect(unsafeRequests).toEqual([]);
      expect(consoleErrors).toEqual([]);
    },
  };
}
