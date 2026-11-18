import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';
const now = '2026-11-11T00:00:00Z';
const profile = { id: 'profile', userId: 'account-test', bio: 'Giới thiệu của tôi', coverUrl: null, headline: '', location: '', isPublic: false };
for (const failedDashboard of [false, true]) test(`profile avatar and cover uploads survive reload with a stale sign-in snapshot, dashboardFailure=${failedDashboard}`, async ({ page }) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lY4AAAAASUVORK5CYII=', 'base64');
  let avatar: string | null = '/synthetic-profile/old.png', cover: string | null = null;
  let releaseDashboard!: () => void;
  const dashboardReady = new Promise<void>(resolve => { releaseDashboard = resolve; });
  const writes: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.name));
  await page.addInitScript(now => {
    if (window.top !== window) return;
    localStorage.setItem('gds.locale.v1', 'en');
    localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-image-access', refreshToken: 'synthetic-image-refresh',
      tokenType: 'Bearer', expiresIn: 900, user: { id: 'image-owner', email: 'image@example.test', fullName: 'Image owner', roles: ['student'],
        avatarUrl: '/synthetic-profile/old.png', status: 'active', createdAt: now, updatedAt: now } }));
  }, now);
  await page.route('**/synthetic-profile/*.png', route => route.fulfill({ contentType: 'image/png', body: png }));
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
    let data: unknown = { items: [], unreadCount: 0 };
    if (request.method() !== 'GET') {
      writes.push(path);
      if (request.method() !== 'POST' || !['/profile/avatar', '/profile/cover'].includes(path)) return route.abort();
      if (path === '/profile/avatar') { avatar = '/synthetic-profile/new-avatar.png'; data = { avatarUrl: avatar }; }
      else { cover = '/synthetic-profile/new-cover.png'; data = { coverUrl: cover }; }
    } else if (path === '/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS };
    else if (path === '/profile/me') data = { ...profile, userId: 'image-owner', coverUrl: cover };
    else if (path === '/profile/career') data = { fullName: 'Image owner', avatarUrl: avatar, email: 'image@example.test', bio: null,
      headline: null, location: null, websiteUrl: null, publicSlug: null, isPublic: false, careerGoal: null, preferredRoles: [],
      preferredWorkModes: [], availabilityStatus: null, availableFrom: null, skills: [], portfolio: [], completedCourses: [], certificates: [] };
    else if (['/profile/skills', '/profile/portfolio'].includes(path)) data = [];
    else if (path === '/profile/learning-profile') data = null;
    else if (path === '/me/dashboard') {
      await dashboardReady;
      if (failedDashboard) return route.fulfill({ status: 500, json: { message: 'Synthetic dashboard unavailable' } });
      data = { statistics: null, certificates: [], recentActivity: [] };
    }
    else if (path === '/membership-cards/me') data = { policy: DEFAULT_PLATFORM_SETTINGS.membership,
      evaluation: { status: 'disabled', tier: null, qualifyingAmountMinor: null, policyRevisionId: null }, legacyPurchasedAccessPreserved: true };
    else if (path === '/affiliate/me') data = { enabled: false, identities: [], totalReferrals: 0, accruedAmountMinor: '0', currency: 'VND',
      availableBalanceMinor: null, withdrawalEnabled: false, walletCreditStatus: 'ADAPTER_NOT_VERIFIED', subAffiliateEnabled: false };
    await route.fulfill({ json: { success: true, data } });
  });
  try {
  await page.goto('/dashboard/profile');
  await expect(page.locator('.student-profile-hero__camera input')).toBeDisabled();
  await expect(page.locator('.student-profile-hero__cover-button input')).toBeDisabled();
  releaseDashboard();
  await page.locator('.student-profile-summary').first().getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('button', { name: 'Save introduction', exact: true })).toBeEnabled();
  await page.getByRole('dialog').getByRole('button', { name: /Close|Đóng/ }).click();
  // The profile no longer depends on Dashboard analytics: failure there must not break profile editing.
  await expect(page.locator('.student-profile-alert')).toHaveCount(0);
  await page.locator('.student-profile-hero__camera input').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.student-profile-hero__avatar img')).toHaveAttribute('src', '/synthetic-profile/new-avatar.png');
  await page.locator('.student-profile-hero__cover-button input').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.student-profile-hero__cover')).toHaveAttribute('src', '/synthetic-profile/new-cover.png');
  await page.reload();
  await page.locator('.student-profile-summary').first().getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('button', { name: 'Save introduction', exact: true })).toBeEnabled();
  await page.getByRole('dialog').getByRole('button', { name: /Close|Đóng/ }).click();
  await expect(page.locator('.student-profile-hero__avatar img')).toHaveAttribute('src', '/synthetic-profile/new-avatar.png');
  await expect(page.locator('.student-profile-hero__cover')).toHaveAttribute('src', '/synthetic-profile/new-cover.png');
  avatar = null;
  await page.reload();
  await page.locator('.student-profile-summary').first().getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('button', { name: 'Save introduction', exact: true })).toBeEnabled();
  await page.getByRole('dialog').getByRole('button', { name: /Close|Đóng/ }).click();
  await expect(page.locator('.student-profile-hero__avatar img')).toHaveCount(0);
  expect(writes).toEqual(['/profile/avatar', '/profile/cover']); expect(errors).toEqual([]);
  } finally { releaseDashboard(); }
});
test('profile clears previous-owner data while a new account profile is loading', async ({ page }) => {
  let releaseNewProfile!: () => void;
  const newProfileReady = new Promise<void>(resolve => { releaseNewProfile = resolve; });
  await page.addInitScript(now => {
    if (window.top !== window) return;
    localStorage.setItem('gds.locale.v1', 'en');
    localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-a', refreshToken: 'synthetic-refresh-a', tokenType: 'Bearer', expiresIn: 900,
      user: { id: 'owner-a', email: 'a@example.test', fullName: 'Owner A', roles: ['student'], status: 'active', createdAt: now, updatedAt: now } }));
  }, now);
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (request.method() !== 'GET') return route.abort();
    const isNewOwner = request.headers().authorization === 'Bearer synthetic-b';
    let data: unknown = null;
    if (path === '/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS };
    else if (path === '/profile/me') {
      if (isNewOwner) await newProfileReady;
      data = { ...profile, userId: isNewOwner ? 'owner-b' : 'owner-a', bio: isNewOwner ? 'Private B' : 'Private A' };
    } else if (['/profile/skills', '/profile/portfolio'].includes(path)) data = [];
    await route.fulfill({ json: { success: true, data } });
  });
  try {
    await page.goto('/dashboard/profile');
    await expect(page.locator('.student-profile-summary').first()).toContainText('Private A');
    await page.locator('.student-profile-summary').first().getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('About you')).toHaveValue('Private A');
    const switcher = await page.context().newPage();
    await switcher.route('**/identity-switch', route => route.fulfill({ contentType: 'text/html', body: '<title>Synthetic identity switch</title>' }));
    await switcher.goto(new URL('/identity-switch', page.url()).href);
    await switcher.evaluate(now => localStorage.setItem('eduai.auth.session.v1', JSON.stringify({
      accessToken: 'synthetic-b', refreshToken: 'synthetic-refresh-b', tokenType: 'Bearer', expiresIn: 900,
      user: { id: 'owner-b', email: 'b@example.test', fullName: 'Owner B', roles: ['student'], status: 'active', createdAt: now, updatedAt: now },
    })), now);
    await expect(page.locator('.student-profile-hero h1')).toHaveText('Owner B');
    await page.locator('.student-profile-summary').first().getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('About you')).toHaveValue('');
    await expect(page.getByLabel('About you')).toBeDisabled();
    releaseNewProfile();
    await expect(page.getByLabel('About you')).toHaveValue('Private B');
    await switcher.close();
  } finally { releaseNewProfile(); }
});
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
    await expect(page.getByRole('heading', { name: 'Giới thiệu bản thân' })).toBeVisible();
    await page.locator('.student-profile-summary').first().getByRole('button', { name: 'Chỉnh sửa' }).click();
    await expect(page.getByRole('button', { name: 'Lưu giới thiệu' })).toBeVisible();
    await expect(page.locator('.student-profile-hero__id')).toHaveText('ID: account-test');
    await expect(page.getByLabel('Giới thiệu bản thân')).toHaveValue('Giới thiệu của tôi');
    await page.getByRole('dialog').getByRole('button', { name: /Close|Đóng/ }).click();
    await expect(page.locator('.student-profile-summary').first()).toContainText('Giới thiệu của tôi');
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
