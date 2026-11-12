import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';
const now = '2026-11-11T00:00:00Z';
const profile = { id: 'profile', userId: 'account-test', bio: 'Giới thiệu của tôi', coverUrl: null, headline: '', location: '', isPublic: false };
for (const role of ['student', 'instructor', 'platform_admin']) for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
  test(`profile, settings, billing and support ${role} at ${width}px`, async ({ page }) => {
    const errors: string[] = []; const writes: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(role => localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', tokenType: 'Bearer', expiresIn: 900, user: { id: 'account-test', email: 'account@example.test', fullName: 'Người học kiểm thử', roles: [role], status: 'active', createdAt: '2026-11-11', updatedAt: '2026-11-11' } })), role);
    await page.route(/\/api\/v1\//, async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname.replace('/api/v1', '');
      if (request.method() !== 'GET') writes.push(path);
      let data: unknown = null;
      if (path === '/platform/settings') data = { settings: { ...DEFAULT_PLATFORM_SETTINGS, operations: { ...DEFAULT_PLATFORM_SETTINGS.operations, supportEnabled: true } }, versions: {} };
      else if (path === '/membership-cards/me') data = {
        policy: DEFAULT_PLATFORM_SETTINGS.membership,
        evaluation: { status: 'disabled', tier: null, qualifyingAmountMinor: null, policyRevisionId: null },
        legacyPurchasedAccessPreserved: true, entitlementMigrationApplied: false,
      };
      else if (path === '/affiliate/me') data = {
        enabled: false, policyRevisionId: null, totalReferrals: 0, identities: [], accruedAmountMinor: '0', currency: 'VND',
        availableBalanceMinor: null, withdrawalEnabled: false, walletCreditStatus: 'ADAPTER_NOT_VERIFIED', subAffiliateEnabled: false,
      };
      else if (path === '/auth/security') data = { passwordMode: 'local', firebaseUid: null };
      else if (path === '/auth/mfa/status') data = { available: false, enabled: false, recoveryCodesRemaining: 0 };
      else if (path === '/profile/me') data = request.method() === 'PUT' ? { ...profile, bio: 'Đã cập nhật' } : profile;
      else if (path === '/community/posts/me') data = { items: [{ id: 'own', title: 'Bài viết riêng của tôi', content: 'Nội dung', visibility: 'private', createdAt: now }], page: 1, totalPages: 1 };
      else if (['/profile/skills', '/profile/portfolio'].includes(path)) data = [];
      else if (path.includes('notifications')) data = { items: [], total: 0, unreadCount: 0, totalPages: 0 };
      else if (path === '/commerce/orders') data = { items: [{ id: 'owned-order', orderNumber: 'GDS-TEST', status: 'CONFIRMED', createdAt: now, lines: [{ title: 'Khóa học' }], payable: { amountMinor: '50000', currency: 'VND' } }], page: 1, totalPages: 1 };
      else if (path === '/platform/support') data = { items: [], page: 1, totalPages: 0 };
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data, message: 'Synthetic test' }) });
    });
    await page.goto(role === 'student' ? '/dashboard/profile' : '/profile');
    await expect(page.getByRole('button', { name: 'Lưu giới thiệu' })).toBeVisible();
    await expect(page.locator('.student-profile-hero__id')).toHaveText('ID: account-test');
    await expect(page.getByLabel('Giới thiệu bản thân')).toHaveValue('Giới thiệu của tôi');
    await expect(page.getByRole('heading', { name: 'Thẻ thành viên', exact: true })).toBeVisible();
    await expect(page.getByText('Chính sách thẻ thành viên chưa được áp dụng.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Bài viết', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Bài viết riêng của tôi' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`gds-profile-${role}-${width}.png`), fullPage: true });
    await page.goto('/settings');
    await expect(page.getByLabel('Mật khẩu hiện tại')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`gds-settings-${role}-${width}.png`), fullPage: true });
    await page.goto('/billing');
    await expect(page.getByRole('heading', { name: 'GDS-TEST' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Chi tiết đơn hàng' })).toHaveAttribute('href', '/billing/orders/owned-order');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`gds-billing-${role}-${width}.png`), fullPage: true });
    await page.goto('/support');
    await page.getByRole('button', { name: 'Tạo yêu cầu' }).click();
    await page.getByLabel('Ảnh đính kèm (tùy chọn)').setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lY4AAAAASUVORK5CYII=', 'base64') });
    await expect(page.getByRole('img', { name: 'Xem trước ảnh đính kèm' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole('dialog').screenshot({ path: test.info().outputPath(`gds-support-${role}-${width}.png`) });
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
  });
}
