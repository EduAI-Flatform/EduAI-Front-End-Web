import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';

for (const locale of ['vi', 'en']) for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
  test(`named achievement and status groups ${locale} ${width}px`, async ({ page }) => {
    const unexpected: string[] = [], writes: string[] = [], errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(locale => {
      localStorage.setItem('gds.locale.v1', locale);
      localStorage.setItem('eduai.auth.session.v1', JSON.stringify({
        accessToken: 'synthetic-groups-access', refreshToken: 'synthetic-groups-refresh', tokenType: 'Bearer', expiresIn: 900,
        user: { id: 'groups-owner', email: 'groups@example.test', fullName: 'Authored owner', roles: ['instructor'], status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      }));
    }, locale);
    await page.route('**/api/v1/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
      if (request.method() !== 'GET') { writes.push(path); return route.abort(); }
      if (path === '/notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: ': synthetic heartbeat\n\n' });
      let data: unknown;
      if (path === '/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS };
      else if (path === '/profile/me') data = { id: 'profile', userId: 'groups-owner', bio: 'Authored biography', coverUrl: null, headline: '', location: '', isPublic: false };
      else if (path === '/profile/career') data = {
        fullName: 'Authored owner', email: 'groups@example.test', avatarUrl: null, bio: 'Authored biography', headline: null, location: null, websiteUrl: null,
        publicSlug: null, isPublic: false, careerGoal: null, preferredRoles: [], preferredWorkModes: [], availabilityStatus: null, availableFrom: null,
        skills: [], portfolio: [], completedCourses: [], certificates: [],
      };
      else if (path === '/profile/skills' || path === '/profile/portfolio') data = [];
      else if (path === '/profile/learning-profile') data = null;
      else if (path === '/me/dashboard') data = { statistics: null, certificates: [], recentActivity: [] };
      else if (path === '/membership-cards/me') data = { policy: DEFAULT_PLATFORM_SETTINGS.membership, evaluation: { status: 'disabled', tier: null }, legacyPurchasedAccessPreserved: true };
      else if (path === '/affiliate/me') data = { enabled: false, identities: [], totalReferrals: 0, accruedAmountMinor: '0', currency: 'VND', availableBalanceMinor: null, withdrawalEnabled: false, walletCreditStatus: 'PROCESSING_DISABLED', subAffiliateEnabled: false };
      else if (path === '/wallet/gds') data = { available: false, mode: 'disabled', state: 'DISABLED', balance: null, debtMinor: null, withdrawalEnabled: false, paymentEnabled: false, topupEnabled: false };
      else if (path === '/tmi/wallet') data = { current: 0 };
      else if (path === '/notifications' || path === '/notifications/unread-count') data = { items: [], total: 0, unreadCount: 0 };
      else if (path === '/instructor/courses') data = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 };
      else { unexpected.push(path); return route.abort(); }
      return route.fulfill({ json: { success: true, data, message: 'Synthetic read-only fixture' } });
    });

    await page.goto('/profile');
    const achievements = page.getByRole('group', { name: locale === 'vi' ? 'Thành tựu đã xác minh' : 'Verified achievements', exact: true });
    await expect(achievements).toBeVisible();
    expect(await achievements.ariaSnapshot()).toContain(locale === 'vi' ? 'Thành tựu đã xác minh' : 'Verified achievements');
    await expect(achievements.locator('span')).toHaveCount(2);
    await expect(page.locator('.student-profile-hero h1')).toHaveText('Authored owner');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.goto('/instructor/dashboard/courses');
    const statuses = page.getByRole('group', { name: locale === 'vi' ? 'Lọc theo trạng thái' : 'Filter by status', exact: true });
    await expect(statuses).toBeVisible();
    expect(await statuses.ariaSnapshot()).toContain(locale === 'vi' ? 'Lọc theo trạng thái' : 'Filter by status');
    await expect(statuses.getByRole('button')).toHaveCount(4);
    await expect(statuses.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(unexpected).toEqual([]); expect(writes).toEqual([]); expect(errors).toEqual([]);
  });
}
