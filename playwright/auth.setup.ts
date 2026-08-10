import { expect, test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { getAuthStatePath, type AuthStateScope } from "./auth-state";

const authDirectory = path.join(process.cwd(), "playwright", ".auth");
const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD;
const authStateScope = getAuthStateScope();

setup.beforeAll(() => {
  if (!demoPassword) {
    throw new Error(
      "DEMO_ACCOUNT_PASSWORD is required to create Playwright auth state.",
    );
  }

  mkdirSync(authDirectory, { recursive: true });
});

setup("Playwright demo password is configured", () => {
  expect(Boolean(process.env.DEMO_ACCOUNT_PASSWORD)).toBe(true);
});

setup("authenticate student demo account", async ({ page }) => {
  await login(page, "student.demo@eduai.local", "/");
  await page.context().storageState({
    path: getAuthStatePath("student", authStateScope),
  });
});

setup("authenticate instructor demo account", async ({ page }) => {
  await login(
    page,
    "instructor.demo@eduai.local",
    "/instructor/dashboard",
  );
  await page.context().storageState({
    path: getAuthStatePath("instructor", authStateScope),
  });
});

setup("authenticate administrator demo account", async ({ page }) => {
  await login(page, "admin.demo@eduai.local", "/admin/dashboard");
  await page.context().storageState({
    path: getAuthStatePath("administrator", authStateScope),
  });
});

async function login(
  page: import("@playwright/test").Page,
  email: string,
  expectedPath: string,
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator("#login-password").fill(demoPassword!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(new URL(expectedPath, page.url()).toString());
}

function getAuthStateScope(): AuthStateScope {
  const scope = process.env.PLAYWRIGHT_AUTH_STATE_SCOPE ?? "local";

  if (scope !== "local" && scope !== "production") {
    throw new Error("PLAYWRIGHT_AUTH_STATE_SCOPE must be local or production.");
  }

  return scope;
}
