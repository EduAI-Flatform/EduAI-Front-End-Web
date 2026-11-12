import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';

const recordId = '10000000-0000-4000-8000-000000000001';
const orderId = '20000000-0000-4000-8000-000000000001';
test('Admin inspects historical sources and exceptions in VI/EN at seven widths', async ({ page }, testInfo) => {
  const writes: string[] = []; const errors: string[] = [];
  let fail = false;
  page.on('pageerror', error => errors.push(error.name));
  await page.addInitScript(() => localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-admin-access', refreshToken: 'synthetic-admin-refresh', expiresIn: 900, tokenType: 'Bearer',
    user: { id: '10000000-0000-4000-8000-000000000001', email: 'admin@example.test', fullName: 'GDS Admin', status: 'active', roles: ['platform_admin'] } })));
  await page.route('**/api/v1/**', async route => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname.replace('/api/v1', '');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.method());
    let data: unknown = {};
    if (path === '/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS };
    else if (path === '/admin/commerce/catalog') data = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };
    else if (path === '/admin/membership/legacy-orders/inventory') {
      if (fail) { await route.fulfill({ status: 503, json: { success: false, error: { code: 'UNAVAILABLE', message: 'Synthetic outage' } } }); return; }
      const source = url.searchParams.get('source');
      data = { source, scope: 'source_page', readOnly: true, migrationReadiness: 'not_assessed', pageSize: 20, observedAt: '2026-11-12T00:00:00Z', requiredSources: ['orders', 'subscriptions', 'course_grants', 'service_grants'], hasMore: !url.searchParams.has('after'), nextCursor: url.searchParams.has('after') ? null : recordId,
        items: [{ id: recordId, orderId, code: 'ORDER_RECONCILIATION_REQUIRED' }, { id: '30000000-0000-4000-8000-000000000001', orderId: null, code: source === 'service_grants' ? 'UNVERIFIED_RECEIPT_ACCESS' : 'SOURCE_ORDER_MISSING' }] };
    } else if (path.endsWith('/reconciliation')) data = { orderId, scope: 'single_order', status: 'attention', readOnly: true, purchasedAccessPreserved: true, findings: [{ code: 'COURSE_GRANT_MISSING', resourceId: recordId }, { code: 'SERVICE_GRANT_REVOKED', resourceId: orderId }] };
    else if (path.includes('/notifications')) data = { items: [], unreadCount: 0, total: 0 };
    await route.fulfill({ status: 200, json: { success: true, data, message: 'ok' } });
  });
  await page.goto('/admin/dashboard/commerce');
  await page.getByRole('tab', { name: 'Đối soát quyền lợi cũ' }).click();
  await expect(page.getByRole('button', { name: 'Xem đối soát' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Xem đối soát' }).click();
  await expect(page.getByText('Thiếu quyền khóa học', { exact: true })).toBeVisible();
  await expect(page.getByText('Quyền dịch vụ đã thu hồi', { exact: true })).toBeVisible();
  for (const locale of ['vi', 'en']) {
    await page.getByRole('combobox', { name: /Ngôn ngữ|Language/ }).selectOption(locale);
    await expect(page.getByRole('heading', { name: locale === 'vi' ? 'Chi tiết đối soát' : 'Reconciliation detail' })).toBeVisible();
    for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const button = page.getByRole('button', { name: locale === 'vi' ? 'Tiếp theo' : 'Next' });
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      if (locale === 'en' && [390, 1440].includes(width)) await page.screenshot({ path: testInfo.outputPath(`legacy-inventory-${width}.png`), fullPage: true });
    }
  }
  await expect(page.getByRole('link', { name: 'Requests and partners', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reload', exact: true }).focus();
  await expect(page.getByRole('button', { name: 'Reload', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await page.getByRole('combobox', { name: 'Data source' }).selectOption('service_grants');
  await expect(page.getByText('Unverified receipt access', { exact: true })).toBeVisible();
  fail = true; await page.getByRole('button', { name: 'Reload', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Unable to load historical sources. Try again.');
  fail = false; await page.getByRole('button', { name: 'Reload', exact: true }).click();
  await expect(page.getByText('Unverified receipt access', { exact: true })).toBeVisible();
  expect(writes).toEqual([]); expect(errors).toEqual([]);
});
