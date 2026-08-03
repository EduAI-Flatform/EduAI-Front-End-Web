import { expect, test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const authDirectory = path.join(process.cwd(), "playwright", ".auth");
const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD;

setup.beforeAll(() => {
  if (!demoPassword) {
    throw new Error(
      "DEMO_ACCOUNT_PASSWORD is required to create Playwright auth state.",
    );
  }

  mkdirSync(authDirectory, { recursive: true });
});

setup("authenticate student demo account", async ({ page }) => {
  await login(page, "student.demo@eduai.local", "/dashboard");
  await page.context().storageState({
    path: path.join(authDirectory, "student.json"),
  });
});

setup("authenticate instructor demo account", async ({ page }) => {
  await login(
    page,
    "instructor.demo@eduai.local",
    "/instructor/dashboard",
  );
  await page.context().storageState({
    path: path.join(authDirectory, "instructor.json"),
  });
});

async function login(
  page: import("@playwright/test").Page,
  email: string,
  expectedPath: string,
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(demoPassword!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${expectedPath.replace("/", "\\/")}`));
}
