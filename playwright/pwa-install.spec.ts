import { expect, test } from "@playwright/test";

const viewports = [320, 375, 390, 412, 768, 1024, 1440];

for (const width of viewports) {
  test(`PWA install entry and shell fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/courses", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("button", { name: "Cài đặt EduAI" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("desktop beforeinstallprompt is captured by the install action", async ({ page }) => {
  await page.goto("/courses", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt"), {
      platforms: ["web"],
      prompt: async () => undefined,
      userChoice: Promise.resolve({ outcome: "dismissed", platform: "web" }),
    });
    window.dispatchEvent(event);
  });

  await expect(page.getByRole("button", { name: "Cài đặt EduAI" })).toBeVisible();
});

test.describe("iOS Safari installation guidance", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });

  test("shows Safari Add to Home Screen steps", async ({ page }) => {
    await page.goto("/courses", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Cài đặt EduAI" }).click();

    await expect(page.getByRole("dialog", { name: "Cài EduAI trên iPhone/iPad" })).toBeVisible();
    await expect(page.getByText(/Thêm vào Màn hình chính/).first()).toBeVisible();
  });
});

test("standalone display mode suppresses the install entry", async ({ page }) => {
  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      if (query === "(display-mode: standalone)") {
        return { matches: true, media: query, addEventListener() {}, removeEventListener() {} } as MediaQueryList;
      }
      return nativeMatchMedia(query);
    };
  });
  await page.goto("/courses", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("button", { name: "Cài đặt EduAI" })).not.toBeVisible();
});

test("offline fallback is branded and retryable", async ({ page }) => {
  await page.goto("/offline.html", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Bạn đang ngoại tuyến" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
});
