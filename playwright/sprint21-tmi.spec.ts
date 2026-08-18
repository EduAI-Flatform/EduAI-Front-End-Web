import { expect, test } from "@playwright/test";
import path from "node:path";

const viewports = [
  { name: "mobile-320", width: 320, height: 800 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

test.use({
  storageState: path.join(process.cwd(), "playwright", ".auth", "student.json"),
});

for (const viewport of viewports) {
  test(`learner TMI rewards is usable at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const tmiStatuses: number[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/v1/tmi/")) tmiStatuses.push(response.status());
    });

    await page.goto("/dashboard/tmi", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Đổi thưởng TMI" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Số dư TMI" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lịch sử TMI" })).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("min-width", "320px");
    await expect.poll(() => tmiStatuses.length).toBe(3);
    expect(tmiStatuses).toEqual([200, 200, 200]);

    const dimensions = await page.locator("body").evaluate((body) => ({
      clientWidth: body.clientWidth,
      scrollWidth: body.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
}
