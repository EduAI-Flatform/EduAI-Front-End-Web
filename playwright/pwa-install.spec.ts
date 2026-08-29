import { expect, test, type Page } from "@playwright/test";

const viewports = [320, 375, 390, 412, 768, 1024, 1440];

type OverflowDiagnostic = {
  bodyScrollWidth: number;
  clientWidth: number;
  documentScrollWidth: number;
  innerWidth: number;
  offenders: Array<{ right: number; selector: string; width: number }>;
};

async function inspectHorizontalOverflow(
  page: Page,
): Promise<OverflowDiagnostic> {
  return page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const safeToken = (value: string) =>
      value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
    const selectorFor = (element: Element) => {
      const id = safeToken(element.id);
      const classes = Array.from(element.classList)
        .map(safeToken)
        .filter(Boolean)
        .slice(0, 3)
        .map((className) => `.${className}`)
        .join("");
      return `${element.tagName.toLowerCase()}${id ? `#${id}` : ""}${classes}`.slice(
        0,
        180,
      );
    };
    const round = (value: number) => Math.round(value * 1_000) / 1_000;
    const offenders = Array.from(document.querySelectorAll("body, body *"))
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.right > clientWidth)
      .sort((left, right) => right.rect.right - left.rect.right)
      .slice(0, 10)
      .map(({ element, rect }) => ({
        right: round(rect.right),
        selector: selectorFor(element),
        width: round(rect.width),
      }));

    return {
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      offenders,
    };
  });
}

function formatOverflowDiagnostic(diagnostic: OverflowDiagnostic): string {
  const offenders = diagnostic.offenders
    .map(
      ({ right, selector, width }) =>
        `${selector}[right=${right},width=${width}]`,
    )
    .join(",");
  return [
    `inner=${diagnostic.innerWidth}`,
    `client=${diagnostic.clientWidth}`,
    `document=${diagnostic.documentScrollWidth}`,
    `body=${diagnostic.bodyScrollWidth}`,
    `offenders=${offenders || "none"}`,
  ].join(";");
}

function escapeWorkflowCommand(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

async function waitForServiceWorkerControl(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
}

for (const width of viewports) {
  test(`PWA shell fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/courses", { waitUntil: "domcontentloaded" });

    const diagnostic = await inspectHorizontalOverflow(page);
    if (diagnostic.documentScrollWidth > diagnostic.clientWidth) {
      console.log(
        `::error title=Sanitized layout overflow::${escapeWorkflowCommand(formatOverflowDiagnostic(diagnostic))}`,
      );
    }
    expect(
      diagnostic.documentScrollWidth,
      `Horizontal overflow: ${formatOverflowDiagnostic(diagnostic)}`,
    ).toBeLessThanOrEqual(diagnostic.clientWidth);
  });
}

test("desktop beforeinstallprompt is captured by the install action", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "beforeinstallprompt is a Chromium API",
  );
  await page.goto("/courses", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt"), {
      platforms: ["web"],
      prompt: async () => undefined,
      userChoice: Promise.resolve({ outcome: "dismissed", platform: "web" }),
    });
    window.dispatchEvent(event);
  });

  await expect(
    page.getByRole("button", { name: "Cài đặt EduAI" }),
  ).toBeVisible();
});

test.describe("iOS Safari installation guidance", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });

  test("shows Safari Add to Home Screen steps", async ({ page }) => {
    await page.goto("/courses", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Cài đặt EduAI" }).click();

    await expect(
      page.getByRole("dialog", { name: "Cài EduAI trên iPhone/iPad" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Thêm vào Màn hình chính/).first(),
    ).toBeVisible();
  });
});

test("standalone display mode suppresses the install entry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      if (query === "(display-mode: standalone)") {
        return {
          matches: true,
          media: query,
          addEventListener() {},
          removeEventListener() {},
        } as MediaQueryList;
      }
      return nativeMatchMedia(query);
    };
  });
  await page.goto("/courses", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("button", { name: "Cài đặt EduAI" }),
  ).not.toBeVisible();
});

test("offline fallback is branded and retryable", async ({ page }) => {
  await page.goto("/offline.html", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Bạn đang ngoại tuyến" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
});

test("auth, callback, API, and private routes fail closed offline", async ({
  context,
  page,
}) => {
  await waitForServiceWorkerControl(page);
  await context.setOffline(true);

  for (const path of [
    "/login?offline-contract=1",
    "/__/auth/handler?offline-contract=1",
    "/dashboard?offline-contract=1",
  ]) {
    const routePage = await context.newPage();
    await expect(
      routePage.goto(path, {
        timeout: 5_000,
        waitUntil: "domcontentloaded",
      }),
    ).rejects.toThrow();
    await routePage.close();
  }

  await expect(
    page.evaluate(async () => {
      try {
        await fetch("/api/v1/auth/firebase");
        return "resolved";
      } catch {
        return "failed";
      }
    }),
  ).resolves.toBe("failed");
});

test("public navigation receives the branded fallback offline", async ({
  browserName,
  context,
  page,
}) => {
  test.skip(
    browserName === "webkit",
    "Playwright WebKit offline emulation does not dispatch navigations to the service worker",
  );
  await waitForServiceWorkerControl(page);
  await context.setOffline(true);
  await page.evaluate(() => {
    window.location.assign("/courses?offline-contract=1");
  });

  await expect(
    page.getByRole("heading", { name: "Bạn đang ngoại tuyến" }),
  ).toBeVisible();
});
