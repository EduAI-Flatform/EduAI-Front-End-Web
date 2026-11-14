import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';

for (const locale of ['vi', 'en'] as const) test(`Admin records partner connection status independently in ${locale}`, async ({ page }) => {
  const settings = structuredClone(DEFAULT_PLATFORM_SETTINGS);
  settings.partners.items.push({ name: 'Synthetic School', logoUrl: '/gds-logo.png', url: 'https://example.test', category: 'school' });
  const original = JSON.stringify(settings.partners);
  const revisions: Array<Record<string, unknown>> = [], writes: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.name));
  await page.addInitScript(({ locale }) => {
    localStorage.setItem('gds.locale.v1', locale);
    localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-admin', refreshToken: 'synthetic-refresh', expiresIn: 900, tokenType: 'Bearer',
      user: { id: '10000000-0000-4000-8000-000000000001', email: 'synthetic@example.test', fullName: 'Synthetic Admin', status: 'active', roles: ['platform_admin'] } }));
  }, { locale });
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
    let data: unknown = { items: [], unreadCount: 0 };
    if (request.method() !== 'GET') writes.push(path);
    if (path === '/platform/settings') data = { settings };
    else if (path === '/admin/platform/settings') data = { settings, revisions, versions: {}, groups: Object.keys(settings) };
    else if (path === '/admin/platform/revisions' && request.method() === 'POST') {
      const revision = { ...request.postDataJSON(), id: '20000000-0000-4000-8000-000000000001', version: 1, status: 'draft', createdAt: '2026-11-14T00:00:00Z', createdById: 'synthetic' };
      revisions.push(revision); data = revision;
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/admin/dashboard/platform-settings?group=partners');
  const select = page.getByRole('combobox', { name: locale === 'vi' ? /Trạng thái kết nối/ : /Connection status/ });
  await expect(select).toHaveValue('unconfigured');
  await expect(select.getByRole('option')).toHaveCount(5);
  await select.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await expect(select).toHaveValue('preparing');
  await select.selectOption('testing');
  await expect(page.getByText(locale === 'vi'
    ? 'Trạng thái ghi nhận riêng với duyệt hồ sơ. Không tự bật API/SSO, tạo tài khoản hoặc cộng điểm.'
    : 'Recorded separately from application approval. This does not enable API/SSO, create accounts or award points.')).toBeVisible();
  for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(select).toBeVisible();
    if (width === 390) await page.screenshot({ path: test.info().outputPath(`partner-status-${locale}-390.png`), fullPage: true });
  }
  await page.getByRole('button', { name: locale === 'vi' ? 'Lưu bản nháp mới' : 'Save new draft' }).click();
  await expect(page.locator('.platform-settings__revision')).toHaveCount(1);
  expect(revisions[0].group).toBe('partners');
  expect(revisions[0].content).toMatchObject({ enabled: false, items: [{ name: 'Synthetic School', connectionStatus: 'testing' }] });
  expect(JSON.stringify(settings.partners)).toBe(original);
  await page.reload(); await page.locator('.platform-settings__revision').click();
  await expect(select).toHaveValue('testing');
  expect(writes).toEqual(['/admin/platform/revisions']); expect(errors).toEqual([]);
});
