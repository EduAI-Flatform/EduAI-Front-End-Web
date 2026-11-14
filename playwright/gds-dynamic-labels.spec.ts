import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';

async function prepare(page: Page) {
  const writes: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.name));
  await page.addInitScript(() => {
    localStorage.setItem('gds.locale.v1', 'vi');
    localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic', refreshToken: 'synthetic', expiresIn: 900, tokenType: 'Bearer',
      user: { id: '10000000-0000-4000-8000-000000000001', email: 'synthetic@example.test', fullName: 'Thông thường', status: 'active', roles: ['platform_admin'] } }));
  });
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (request.method() !== 'GET') writes.push(path);
    let data: unknown = { items: [], unreadCount: 0 };
    if (path === '/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS };
    else if (path === '/admin/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS, versions: {}, groups: Object.keys(DEFAULT_PLATFORM_SETTINGS),
      revisions: ['draft', 'approved', 'scheduled', 'cancelled'].map((status, index) => ({ id: String(index), group: 'branding', version: index + 1, status,
        content: DEFAULT_PLATFORM_SETTINGS.branding, createdAt: '2026-11-14T00:00:00Z', createdById: 'Bản nháp' })) };
    else if (path === '/affiliate/me') data = { enabled: false, totalReferrals: 2, identities: [], accruedAmountMinor: '0', availableBalanceMinor: null };
    else if (path === '/affiliate/performance') data = { page: 1, totalPages: 1, items: ['general', 'instructor'].map((kind, index) => ({ id: String(index), kind,
      userName: index ? 'Giảng viên' : 'Thông thường', orderNumber: 'GDS-' + index, accruedAmountMinor: '15000', createdAt: '2026-11-14T00:00:00Z' })) };
    await route.fulfill({ json: { success: true, data } });
  });
  return { writes, errors };
}

test('policy revision statuses relocalize at all required widths without changing creator IDs', async ({ page }) => {
  const { writes, errors } = await prepare(page);
  await page.goto('/admin/dashboard/platform-settings');
  for (const locale of ['vi', 'en', 'vi']) {
    await page.getByRole('combobox', { name: /Ngôn ngữ|Language/ }).selectOption(locale);
    await expect(page.locator('.platform-settings__revision strong')).toHaveText(locale === 'vi'
      ? ['v1 · Bản nháp', 'v2 · Đã duyệt', 'v3 · Đã đặt lịch', 'v4 · Đã hủy']
      : ['v1 · Draft', 'v2 · Approved', 'v3 · Scheduled', 'v4 · Cancelled']);
    await expect(page.locator('.platform-settings__revision small').first()).toContainText('Bản nháp');
    for (const width of [320,375,390,412,768,1024,1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  }
  expect(writes).toEqual([]); expect(errors).toEqual([]);
});

test('referral kinds relocalize without changing identically named users or sending mutations', async ({ page }) => {
  const { writes, errors } = await prepare(page);
  await page.goto('/affiliate');
  await page.getByRole('button', { name: 'Hiệu quả tiếp thị liên kết' }).click();
  for (const locale of ['vi', 'en', 'vi']) {
    await page.getByRole('combobox', { name: /Ngôn ngữ|Language/ }).selectOption(locale);
    await expect(page.locator('.affiliate-page__records article h3')).toHaveText(['Thông thường', 'Giảng viên']);
    await expect(page.locator('.affiliate-page__records article').first().locator('p').first()).toHaveText('GDS-0 · ' + (locale === 'vi' ? 'Thông thường' : 'General'));
    await expect(page.locator('.affiliate-page__records article').last().locator('p').first()).toHaveText('GDS-1 · ' + (locale === 'vi' ? 'Giảng viên' : 'Instructor'));
    for (const width of [320,375,390,412,768,1024,1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    if (locale === 'en') await page.screenshot({ path: test.info().outputPath('dynamic-affiliate-en-1440.png'), fullPage: true });
  }
  expect(writes).toEqual([]); expect(errors).toEqual([]);
});
