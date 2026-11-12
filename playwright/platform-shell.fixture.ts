import { test as base } from '@playwright/test';

// Domain suites mock their own APIs. The shared GDS header also reads public
// configuration and notifications on authenticated pages; keep those synthetic
// without relaxing strict runtime/network assertions.
export const test = base.extend<{ platformShell: void }>({
  platformShell: [async ({ page }, use) => {
    await page.route('**/api/v1/platform/settings', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { settings: {} } }),
    }));
    await page.route('**/api/v1/notifications/unread-count', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { unreadCount: 0 } }),
    }));
    await page.route('**/api/v1/notifications/stream', route => route.fulfill({
      status: 200, contentType: 'text/event-stream', body: ': synthetic notification heartbeat\n\n',
    }));
    await use();
  }, { auto: true }],
});
