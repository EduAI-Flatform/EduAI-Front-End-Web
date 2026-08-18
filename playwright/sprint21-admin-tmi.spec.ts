import { expect, test } from "@playwright/test";
import path from "node:path";

const viewports = [
  { name: "mobile-320", width: 320, height: 900 },
  { name: "desktop-1440", width: 1440, height: 1000 },
];

test.use({
  storageState: path.join(process.cwd(), "playwright", ".auth", "administrator.json"),
});

for (const viewport of viewports) {
  test(`admin TMI rewards is usable at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const endpointStatuses = new Map<string, number[]>();
    const consoleErrors: string[] = [];
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (/\/api\/v1\/admin\/tmi\/(rewards|redemptions|ledger)/.test(url.pathname)) {
        endpointStatuses.set(url.pathname, [...(endpointStatuses.get(url.pathname) ?? []), response.status()]);
      }
    });
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

    await page.goto("/admin/dashboard/tmi", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".admin-tmi-page__header h1")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Redemptions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ledger" })).toBeVisible();
    await expect.poll(() => endpointStatuses.size).toBe(3);
    expect([...endpointStatuses.values()].every((statuses) => statuses.at(-1) === 200)).toBe(true);
    expect(consoleErrors).toEqual([]);

    const dimensions = await page.locator("body").evaluate((body) => ({ clientWidth: body.clientWidth, scrollWidth: body.scrollWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
}
