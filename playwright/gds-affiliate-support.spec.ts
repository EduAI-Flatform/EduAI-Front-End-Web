import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';
for (const locale of ['vi', 'en']) test('configured affiliate support '+locale, async ({ page }) => {
 const writes: string[] = [], errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
 await page.addInitScript(locale => { localStorage.setItem('gds.locale.v1', locale); localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', tokenType: 'Bearer', expiresIn: 900, user: { id: 'support-test', email: 'support-test@example.test', fullName: 'Support fixture', roles: ['student'], status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-01' } })); }, locale);
 await page.route('**/api/v1/**', route => {
  const req = route.request(), path = new URL(req.url()).pathname.replace('/api/v1', '');
  if (req.method() !== 'GET') { writes.push(path); return route.abort(); }
  let data: unknown = [];
  if (path === '/platform/settings') data = { settings: { ...DEFAULT_PLATFORM_SETTINGS, branding: { ...DEFAULT_PLATFORM_SETTINGS.branding, supportEmail: "o'connor@example.test", supportUrl: 'https://support.example.test/referrals' } } };
  else if (path === '/affiliate/me') data = { enabled: false, totalReferrals: 0, identities: [], accruedAmountMinor: '0', availableBalanceMinor: null };
  else if (path.startsWith('/affiliate/performance')) data = { items: [], page: 1, totalPages: 0 };
  else if (path.includes('notifications')) data = { items: [], total: 0, unreadCount: 0 };
  return route.fulfill({ json: { success: true, data, message: 'Synthetic fixture' } });
 });
 await page.goto('/affiliate');
 const support = page.getByRole('region', { name: locale === 'vi' ? 'Hỗ trợ referral' : 'Referral support' });
 await expect(support).toBeVisible();
 await expect(support.getByRole('link', { name: locale === 'vi' ? 'Email hỗ trợ' : 'Support email' })).toHaveAttribute('href', 'mailto:o%27connor%40example.test');
 const supportPage = support.getByRole('link', { name: locale === 'vi' ? 'Trang hỗ trợ' : 'Support page' });
 await expect(supportPage).toHaveAttribute('href', 'https://support.example.test/referrals');
 await supportPage.focus(); await expect(supportPage).toBeFocused();
 await expect(page.getByRole('button', { name: locale === 'vi' ? 'Tạo mã referral' : 'Create referral code' })).toBeDisabled();
 for (const width of [320, 375, 390, 412, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
 expect(writes).toEqual([]); expect(errors).toEqual([]);
});
