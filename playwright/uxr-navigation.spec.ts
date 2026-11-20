import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';

const session = JSON.stringify({
  accessToken: 'uxr-synthetic-access', refreshToken: '',
  tokenType: 'Bearer', expiresIn: 900,
  user: {
    id: 'uxr-student', email: 'uxr@example.invalid', fullName: 'Học viên UXR',
    roles: ['student'], status: 'active', createdAt: '2026-11-18', updatedAt: '2026-11-18',
  },
});

test('public study and certificate destinations do not redirect guests into an account', async ({ page }) => {
  await page.route('**/api/v1/**', route => route.fulfill({ json: { success: true, data: {
    settings: { ...DEFAULT_PLATFORM_SETTINGS, navigation: DEFAULT_PLATFORM_SETTINGS.navigation.map(item =>
      item.id === 'learning' ? { ...item, path: '/dashboard' } :
      item.id === 'certificates' ? { ...item, path: '/dashboard/certificates' } : item),
    },
  } } }));
  await page.goto('/study');
  await expect(page.getByRole('heading', { level: 1, name: 'Học tập cùng GDS' })).toBeVisible();
  await expect(page.locator('.app-header__nav').getByRole('link', { name: 'Học tập' })).toHaveAttribute('href','/study');
  await page.locator('.app-header__nav').getByRole('link', { name: 'Chứng chỉ' }).click();
  await expect(page).toHaveURL(/\/certificates$/);
  await expect(page.getByRole('link', { name: 'Đăng nhập để xem chứng chỉ' })).toBeVisible();
  await expect(page.locator('.student-sidebar')).toHaveCount(0);
});

for (const width of [320, 375, 768, 1024, 1440, 1920]) {
  test('student account layout and branded menus remain consistent at ' + width + 'px', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => {
      localStorage.setItem('eduai.auth.session.v1', value);
      // Do not reset the user's saved language on every full-page navigation.
      if (!localStorage.getItem('gds.locale.v1')) localStorage.setItem('gds.locale.v1', 'vi');
    }, session);
    await page.route('**/api/v1/**', route => {
      const path = new URL(route.request().url()).pathname;
      const data: unknown = path.endsWith('/platform/settings') ? { settings: DEFAULT_PLATFORM_SETTINGS } :
        path.endsWith('/commerce/orders') ? { items: [], totalPages: 0 } :
        path.endsWith('/profile/me') ? { bio: 'Học viên kiểm thử', coverUrl: null } :
        path.endsWith('/profile/career') ? { careerGoal: 'Học công nghệ', preferredRoles: [], preferredWorkModes: [], completedCourses: [], certificates: [] } :
        path.endsWith('/profile/learning-profile') ? null :
        path.endsWith('/profile/portfolio') || path.endsWith('/profile/skills') ? [] :
        path.endsWith('/membership-cards/me') ? { policy: DEFAULT_PLATFORM_SETTINGS.membership, evaluation: { status: 'disabled', tier: null }, legacyPurchasedAccessPreserved: true } :
        { items: [], unreadCount: 0 };
      return route.fulfill({ json: { success: true, data } });
    });
    await page.goto('/billing');
    await expect(page.locator('.student-sidebar')).toBeAttached();
    await expect(page.getByRole('heading', { level: 1, name: 'Thanh toán' })).toBeVisible();
    await expect(page.locator('.student-sidebar__link[href="/billing"]')).toHaveAttribute('aria-current', 'page');
    if (width <= 375) {
      const label = page.locator('.student-sidebar__link[href="/billing"] span');
      await expect(label).toBeVisible();
      await expect(label).toHaveText('Thanh toán');
    }
    await expect(page.locator('.student-sidebar').getByRole('link', { name: 'Thư viện' })).toHaveCount(0);
    await expect(page.locator('.student-sidebar').getByRole('link', { name: 'Chứng chỉ' })).toHaveCount(0);
    await page.locator('.gds-language-menu summary').click();
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Billing' })).toBeVisible();
    await page.locator('.gds-account-menu summary').click();
    await expect(page.locator('.gds-account-menu__identity')).not.toContainText('ID:');
    await expect(page.locator('.gds-account-menu__panel').getByRole('link', { name: 'Settings' })).toBeVisible();
    await page.goto('/profile');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('gds.locale.v1'))).toBe('en');
    await expect(page.locator('.student-sidebar')).toBeAttached();
    await expect(page.locator('.dashboard-account-bar__metric--points')).toBeVisible();
    await expect(page.locator('.dashboard-account-bar__metric--credit')).toBeVisible();
    await expect(page.locator('.dashboard-account-bar__metric--points img')).toHaveAttribute('src', '/gds-point.webp');
    await page.locator('.gds-account-menu summary').click();
    await expect(page.locator('.gds-account-menu__panel')).toHaveCSS('background-image', /gradient/);
    await page.keyboard.press('Escape');
    await expect(page.locator('.student-profile-summary').first()).toContainText('Học viên kiểm thử');
    await page.locator('.student-profile-summary').first().getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'About you' })).toHaveValue('Học viên kiểm thử');
    await page.getByRole('textbox', { name: 'About you' }).fill('Unsaved draft');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.student-profile-summary').first()).toContainText('Học viên kiểm thử');
    await expect(page.locator('.student-profile-summary').first()).not.toContainText('Unsaved draft');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('public route transitions reset scroll while browser Back restores previous position', async ({ page }) => {
  await page.route('**/api/v1/**', route => route.fulfill({ json: { success: true, data: { settings: DEFAULT_PLATFORM_SETTINGS } } }));
  await page.goto('/study');
  await page.evaluate(() => { document.body.style.minHeight = '2800px'; window.scrollTo(0, 640); });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  await page.locator('.app-header__nav').getByRole('link', { name: 'Chứng chỉ' }).click();
  await expect(page).toHaveURL(/\/certificates$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/study$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
});

for (const width of [375, 1440]) {
  test('UI-01–05 branded learner surfaces remain readable at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => {
      localStorage.setItem('eduai.auth.session.v1', value);
      localStorage.setItem('gds.locale.v1', 'vi');
    }, session);
    const writes: string[] = [];
    await page.route('**/api/v1/**', route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() !== 'GET') writes.push(path);
      const paged = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 };
      const data: unknown = path.endsWith('/platform/settings') ? { settings: DEFAULT_PLATFORM_SETTINGS } :
        path.endsWith('/tmi/wallet') ? { current: 32, earned: 32, spent: 0, expired: 0 } :
        path.endsWith('/tmi/history') ? [] :
        path.endsWith('/tmi/rewards') ? paged :
        path.endsWith('/platform/support') ? paged :
        path.endsWith('/me/job-applications') || path.endsWith('/me/saved-jobs') ? paged :
        path.endsWith('/mentor-bookings') || path.endsWith('/mentors') ? paged :
        path.endsWith('/wallet/gds') ? {
          available: true, mode: 'production', state: 'READY_PRODUCTION',
          balance: { settledMinor: '25000', availableMinor: '25000', reservedMinor: '0', currency: 'VND' },
          topupEnabled: true, paymentEnabled: true, withdrawalEnabled: true,
          paymentHeldMinor: '0', withdrawalHeldMinor: '0', totalDepositedMinor: '25000',
          totalPaidMinor: '0', totalWithdrawnMinor: '0', debtMinor: '0', income: null,
          recentTransactions: [],
        } :
        path.endsWith('/wallet/gds/transactions') ? { items: [], hasMore: false, nextCursor: null } :
        path.endsWith('/withdrawal-settings') ? { minimumMinor: '10000', maximumMinor: '10000000', version: 1, admissionEnabled: true, processingEnabled: true } :
        { items: [], unreadCount: 0 };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
    });
    const pages: Array<[string, string, string]> = [
      ['/dashboard/tmi', 'Đổi thưởng GDS Point', 'rewards'],
      ['/wallet/gds', 'Ví của tôi', 'wallet'],
      ['/support', 'Hỗ trợ', 'support'],
      ['/dashboard/job-applications', 'Hồ sơ ứng tuyển', 'applications'],
      ['/dashboard/mentors', 'Tìm cố vấn phù hợp', 'mentors'],
      ['/dashboard/mentor-bookings', 'Lịch cố vấn của tôi', 'mentor-bookings'],
    ];
    for (const [url, heading, label] of pages) {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.locator('.dashboard-account-bar__metric--points')).toBeVisible();
      await expect(page.locator('.dashboard-account-bar__metric--credit')).toBeVisible();
      await expect(page.locator('.dashboard-account-bar__metric--points img')).toHaveAttribute('src', '/gds-point.webp');
      if (label === 'rewards') {
        const mark = page.locator('.tmi-rewards__headline .gds-point-mark--hero img');
        await expect(mark).toBeVisible();
        expect(await mark.evaluate(img => img.getBoundingClientRect().width)).toBeGreaterThan(70);
      }
      if (label === 'wallet') {
        await expect(page.locator('.gds-wallet-page__balance-value')).toHaveText('25.000 ₫');
        await expect(page.locator('.gds-wallet-page__tmi-card .gds-point-mark--large img')).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: test.info().outputPath('ui-gds-' + label + '-' + width + '.png'), fullPage: true });
    }
    expect(writes).toEqual([]);
  });
}
