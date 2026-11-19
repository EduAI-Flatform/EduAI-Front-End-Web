import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';
const widths = [320, 375, 390, 412, 768, 1024, 1440];
for (const width of widths) test('billing filters and keyboard focus at '+width+'px', async ({ page }) => {
 const writes: string[] = [], errors: string[] = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.setViewportSize({ width, height: 900 });
 await page.addInitScript(() => {
  localStorage.setItem('gds.locale.v1', 'en');
  localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', tokenType: 'Bearer', expiresIn: 900, user: { id: 'locale-test', email: 'locale@example.test', fullName: 'Trạng thái', roles: ['student'], status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-01' } }));
 });
 await page.route('**/api/v1/**', route => {
  const req = route.request(), url = new URL(req.url()), path = url.pathname.replace('/api/v1', '');
  if (req.method() !== 'GET') { writes.push(path); return route.abort(); }
  let data: unknown = [];
  if (path === '/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS };
  else if (path.includes('notifications')) data = { items: [], total: 0, unreadCount: 0 };
  else if (path === '/commerce/orders') {
   const filtered = Boolean(url.searchParams.get('status') || url.searchParams.get('startDate') || url.searchParams.get('endDate'));
   const pageNumber = Number(url.searchParams.get('page') || 1);
   data = { items: filtered && pageNumber !== 1 ? [] : [{ id: 'owned-order', orderNumber: 'GDS-LOCALE', createdAt: '2026-01-23', status: 'LATE_PAYMENT_REVIEW', lines: [{ title: 'Trạng thái' }], payable: { amountMinor: '50000', currency: 'VND' } }], page: pageNumber, totalPages: filtered ? 1 : 2 };
  }
  return route.fulfill({ json: { success: true, data, message: 'Synthetic fixture' } });
 });
 await page.goto('/billing');
 await expect(page.getByText('Late payment under review', { exact: true })).toBeVisible();
 for (const label of ['Status', 'Start date', 'End date']) {
  const pageTwo = page.waitForResponse(response => response.url().includes('/commerce/orders?') && new URL(response.url()).searchParams.get('page') === '2');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await pageTwo;
  await expect(page.locator('.account-panel')).toBeVisible();
  await expect(page.getByText('2 / 2', { exact: true })).toBeVisible();
  const request = page.waitForRequest(req => req.url().includes('/commerce/orders?') && new URL(req.url()).searchParams.get('page') === '1');
  if (label === 'Status') await page.locator('.account-filters select').selectOption('paid'); else await page.getByLabel(label, { exact: true }).fill('2026-01-01');
  await request;
  await expect(page.getByText('GDS-LOCALE', { exact: true })).toBeVisible();
  if (label === 'Status') await page.locator('.account-filters select').selectOption(''); else await page.getByLabel(label, { exact: true }).fill('');
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
 }
 await page.locator('.gds-language-menu summary').click();
 await page.getByRole('button', { name: 'Vietnamese' }).click();
 await expect(page.getByText('Thanh toán muộn đang được xem xét', { exact: true })).toBeVisible();
 await page.locator('.gds-language-menu summary').focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('.gds-language-menu')).toHaveAttribute('open','');
 await page.keyboard.press('Escape');
 await expect(page.locator('.gds-language-menu')).not.toHaveAttribute('open','');
 await expect(page.locator('.gds-language-menu summary')).toBeFocused();
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 expect(writes).toEqual([]); expect(errors).toEqual([]);
});
