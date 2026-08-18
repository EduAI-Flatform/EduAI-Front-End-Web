import { expect, test } from "@playwright/test";
import path from "node:path";

const courseId = "00000020-0000-4000-8000-000000000004";
const voucherCourseId = "00000020-0000-4000-8000-000000000001";
const activeScholarshipId = "00000032-0000-4000-8000-000000000001";
const activeRewardId = "00000033-0000-4000-8000-000000000001";

async function browserApi(
  page: import("@playwright/test").Page,
  requestPath: string,
  init?: { method?: string; body?: unknown },
) {
  return page.evaluate(
    async ({ requestPath, init }) => {
      const rawSession = window.localStorage.getItem("eduai.auth.session.v1");
      const accessToken = rawSession
        ? (JSON.parse(rawSession) as { accessToken?: string }).accessToken
        : undefined;
      const response = await fetch(requestPath, {
        method: init?.method ?? "GET",
        headers: {
          ...(init?.body ? { "content-type": "application/json" } : {}),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: init?.body ? JSON.stringify(init.body) : undefined,
      });
      return { status: response.status, body: await response.text() };
    },
    { requestPath, init },
  );
}

test.describe("SPR21 final demo dataset", () => {
  test.use({
    storageState: path.join(process.cwd(), "playwright", ".auth", "student.json"),
  });

  test("student can read the final course, voucher, scholarship, and TMI scenarios", async ({ page }) => {
    await page.goto(`/courses/${courseId}`, { waitUntil: "domcontentloaded" });

    const course = await browserApi(page, `/api/v1/courses/${courseId}`);
    expect(course.status).toBe(200);
    expect(course.body).toContain(courseId);

    const voucher = await browserApi(
      page,
      `/api/v1/courses/${voucherCourseId}/voucher-preview`,
      {
        method: "POST",
        body: {
          code: "EDUAI-FINAL-20",
          redemptionKey: "final-demo-preview-001",
        },
      },
    );
    expect(voucher.status).toBe(201);

    const scholarships = await browserApi(
      page,
      `/api/v1/scholarships?courseId=${courseId}`,
    );
    expect(scholarships.status).toBe(200);

    const scholarshipPreview = await browserApi(
      page,
      `/api/v1/scholarships/${activeScholarshipId}/preview?courseId=${courseId}`,
    );
    expect(scholarshipPreview.status).toBe(200);
    expect(scholarshipPreview.body).toContain(activeScholarshipId);

    const [rewards, wallet, history] = await Promise.all([
      browserApi(page, `/api/v1/tmi/rewards`),
      browserApi(page, `/api/v1/tmi/wallet`),
      browserApi(page, `/api/v1/tmi/history`),
    ]);
    expect(rewards.status).toBe(200);
    expect(rewards.body).toContain(activeRewardId);
    expect(wallet.status).toBe(200);
    expect(history.status).toBe(200);
  });

  for (const viewport of [
    { name: "mobile-320", width: 320, height: 800 },
    { name: "desktop-1440", width: 1440, height: 900 },
  ]) {
    test(`final course detail remains usable at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/courses/${courseId}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".course-detail-page h1")).toBeVisible();
      await expect(page.locator("body")).toHaveCSS("min-width", "320px");
      const dimensions = await page.locator("body").evaluate((body) => ({
        clientWidth: body.clientWidth,
        scrollWidth: body.scrollWidth,
        offenders: Array.from(body.querySelectorAll("*"))
          .map((element) => {
            const node = element as HTMLElement;
            return {
              element: `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}${node.className && typeof node.className === "string" ? `.${node.className.split(/\s+/).filter(Boolean).join(".")}` : ""}`,
              clientWidth: node.clientWidth,
              scrollWidth: node.scrollWidth,
            };
          })
          .filter((entry) => entry.scrollWidth > entry.clientWidth + 1)
          .sort((left, right) => right.scrollWidth - left.scrollWidth)
          .slice(0, 5),
      }));
      expect(
        dimensions.scrollWidth,
        JSON.stringify(dimensions.offenders),
      ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    });
  }
});

test.describe("SPR21 final demo admin read matrix", () => {
  test.use({
    storageState: path.join(process.cwd(), "playwright", ".auth", "administrator.json"),
  });

  test("administrator can read final voucher, scholarship, and TMI records", async ({ page }) => {
    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });
    const responses = await Promise.all([
      browserApi(page, "/api/v1/admin/vouchers?page=1&pageSize=20"),
      browserApi(page, "/api/v1/admin/scholarships?page=1&pageSize=20"),
      browserApi(page, "/api/v1/admin/tmi/rewards?page=1&pageSize=20"),
      browserApi(page, "/api/v1/admin/tmi/redemptions?page=1&pageSize=20"),
      browserApi(page, "/api/v1/admin/tmi/ledger?page=1&pageSize=20"),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200]);
  });
});
