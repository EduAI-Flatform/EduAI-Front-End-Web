import { expect, test } from "@playwright/test";
import { getAuthStatePath } from "./auth-state";

const apiOrigin = "https://api.eduai.giaoducso.org.vn";
const streamPath = "/api/v1/notifications/stream";
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

const roles = [
  { name: "student", route: "/dashboard" },
  { name: "instructor", route: "/instructor/dashboard" },
  { name: "administrator", route: "/admin/dashboard" },
] as const;

test("rejects unauthenticated notification stream access", async ({ request }) => {
  const response = await request.get(`${apiOrigin}${streamPath}`);

  expect(response.status()).toBe(401);
});

for (const role of roles) {
  test.describe(`${role.name} production notification SSE`, () => {
    test.use({ storageState: getAuthStatePath(role.name, "production") });

    test("opens an authenticated event stream without unsafe requests or console errors", async ({ page }) => {
      const audit = installReadOnlyAudit(page);
      const streamResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          new URL(response.url()).origin === apiOrigin &&
          new URL(response.url()).pathname === streamPath,
      );

      await page.goto(role.route, { waitUntil: "domcontentloaded" });
      expect((await streamResponse).status()).toBe(200);
      await expect(page.locator(".notification-center__trigger")).toBeVisible();

      audit.assertClean();
    });

    test("reconnects and falls back to notification polling when the stream is unavailable", async ({ page }) => {
      const audit = installReadOnlyAudit(page, { allowExpectedStreamAbort: true });
      let streamAttempts = 0;
      let unreadCountRequests = 0;

      await page.route(`${apiOrigin}${streamPath}`, async (route) => {
        streamAttempts += 1;
        await route.abort("failed");
      });
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (
          request.method() === "GET" &&
          url.origin === apiOrigin &&
          url.pathname === "/api/v1/notifications/unread-count"
        ) {
          unreadCountRequests += 1;
        }
      });

      await page.goto(role.route, { waitUntil: "domcontentloaded" });
      await expect
        .poll(() => streamAttempts, { message: "the client should retry the notification stream" })
        .toBeGreaterThanOrEqual(2);
      await expect
        .poll(() => unreadCountRequests, { message: "the client should poll when the stream fails" })
        .toBeGreaterThanOrEqual(2);

      audit.assertClean();
    });
  });
}

function installReadOnlyAudit(
  page: import("@playwright/test").Page,
  options: { allowExpectedStreamAbort?: boolean } = {},
) {
  const unsafeRequests: string[] = [];
  const consoleErrors: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === apiOrigin && url.pathname.startsWith("/api/") && !safeMethods.has(request.method())) {
      unsafeRequests.push(`${request.method()} ${url.pathname}`);
    }
  });
  page.on("console", (message) => {
    const isExpectedStreamAbort =
      options.allowExpectedStreamAbort &&
      message.type() === "error" &&
      /ERR_FAILED/i.test(message.text());
    if (message.type() === "error" && !isExpectedStreamAbort) {
      consoleErrors.push(message.type());
    }
  });

  return {
    assertClean() {
      expect(unsafeRequests).toEqual([]);
      expect(consoleErrors).toEqual([]);
    },
  };
}
