import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';

// Synthetic read-only responses: declining a confirmation must never issue a write.
for (const width of [320, 375, 390, 412, 768, 1024, 1440]) test(`commerce labels and declined confirmations ${width}px`, async ({ page, baseURL }) => {
  const writes: string[] = [], unknown: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('gds.locale.v1', 'vi');
    localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-commerce-access', refreshToken: 'synthetic-commerce-refresh', tokenType: 'Bearer', expiresIn: 900,
      user: { id: 'synthetic-admin', fullName: 'Authored admin', email: 'commerce@example.test', roles: ['platform_admin'], status: 'active' } }));
  });
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) { unknown.push(url.origin); return route.abort(); }
    if (!url.pathname.startsWith('/api/v1/')) return route.continue();
    const path = url.pathname.slice('/api/v1'.length);
    if (request.method() !== 'GET') { writes.push(`${request.method()} ${path}`); return route.abort(); }
    let data: unknown;
    if (path === '/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS };
    else if (path.endsWith('/notifications/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': synthetic heartbeat\n\n' });
    else if (path.includes('notifications')) data = { items: [], total: 0, unreadCount: 0 };
    else if (path === '/admin/commerce/catalog') data = { items: [{ id: 'course', title: 'Authored course', slug: 'authored-course', instructor: { fullName: 'Authored instructor' }, status: 'PUBLISHED', visibility: 'PUBLIC', moderationStatus: 'CLEAR', priceAmountMinor: '250000', priceCurrency: 'VND', updatedAt: '2030-01-01', product: null }], total: 1, page: 1, totalPages: 1 };
    else if (path === '/admin/commerce/refunds') data = { items: [{ id: 'refund', status: 'REQUESTED', amountMinor: '1234', currency: 'VND', reasonCode: 'AUTHORED_REASON', updatedAt: '2030-01-01', order: { orderNumber: 'Authored order' }, requestedBy: { fullName: 'Authored requester' }, recordedBy: null, recordedAt: null, externalReference: null, rejectionReasonCode: null, allocations: [{ orderLineId: 'line', productType: 'COURSE', displayTitle: 'Authored course', amountMinor: '1234', currency: 'VND' }] }], total: 1, page: 1, totalPages: 1 };
    else { unknown.push(path); return route.abort(); }
    return route.fulfill({ json: { success: true, data, message: 'Synthetic read-only commerce fixture' } });
  });
  await page.goto('/admin/dashboard/commerce');
  const tabs = page.locator('.admin-commerce-tabs [role="tab"]');
  for (const locale of ['vi', 'en', 'vi']) {
    await page.locator('select').filter({ has: page.locator('option[value="vi"]') }).filter({ has: page.locator('option[value="en"]') }).selectOption(locale);
    await tabs.nth(0).click();
    await page.locator('.admin-commerce-list button').first().click();
    await expect(page.locator('.admin-commerce-course-summary > strong')).toHaveText('Authored course');
    await expect(page.locator('.admin-commerce-course-summary > span')).toHaveText(locale === 'vi' ? 'Đã xuất bản · Công khai · Không có cảnh báo' : 'Published · Public · Clear');
    await tabs.nth(3).click();
    await page.locator('.admin-commerce-list button').first().click();
    const detail = page.locator('.admin-commerce-detail');
    await expect(detail).toContainText(locale === 'vi' ? 'Đã yêu cầu' : 'Requested');
    await expect(detail).toContainText(locale === 'vi' ? 'Chưa ghi nhận' : 'Not recorded');
    await expect(detail.locator('.admin-commerce-detail__lines small')).toHaveText(locale === 'vi' ? 'Khóa học' : 'Course');
    await expect(detail).toContainText('AUTHORED_REASON');
    await expect(detail).toContainText('Authored course');
    for (const [button, prompt] of locale === 'vi' ? [
      ['Kiểm tra thanh toán đến hạn', 'Kiểm tra các yêu cầu thanh toán đã đến hạn?'],
      ['Từ chối yêu cầu', 'Từ chối yêu cầu hoàn tiền với lý do đã nhập?'],
    ] : [
      ['Check due payments', 'Check payment requests that are due?'],
      ['Reject request', 'Reject the refund request with the entered reason?'],
    ]) {
      const dialog = page.waitForEvent('dialog');
      const click = page.getByRole('button', { name: button, exact: true }).click();
      const confirmation = await dialog;
      expect(confirmation.message()).toBe(prompt);
      await confirmation.dismiss(); await click;
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(writes).toEqual([]); expect(unknown).toEqual([]); expect(errors).toEqual([]);
});
