import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';

const summary = {
  asOf: '2030-03-01T12:00:00.000Z', timeZone: 'UTC', currency: 'VND', commissionBasis: 'recorded_signed_accruals',
  lifetimeCommissionMinor: '120', commissionStatus: 'available', commissionReason: null,
  today: { startsAt: '2030-03-01T00:00:00.000Z', endsBefore: '2030-03-01T12:00:00.000Z', amountMinor: '-30' },
  month: { startsAt: '2030-03-01T00:00:00.000Z', endsBefore: '2030-03-01T12:00:00.000Z', amountMinor: '0' },
  revenue: { status: 'available', amountMinor: '9007199254740993', basis: 'net_verified_paid_after_recorded_refunds', complete: true, reason: null },
  ranking: { status: 'unconfigured', value: null, reason: 'RANKING_POLICY_NOT_CONFIGURED' },
  subAffiliates: { status: 'disabled', count: null, reason: 'SUB_AFFILIATE_POLICY_NOT_ENABLED' },
};
for (const width of [320, 375, 390, 412, 768, 1024, 1440]) test(`source-backed affiliate summary and old-server fallback ${width}px`, async ({ page }) => {
  const writes: string[] = [], unknown: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('gds.locale.v1', 'vi');
    localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-summary-access', refreshToken: 'synthetic-summary-refresh', tokenType: 'Bearer', expiresIn: 900,
      user: { id: 'synthetic-summary-owner', fullName: 'Authored fixture', email: 'summary@example.test', roles: ['instructor'], status: 'active' } }));
  });
  let scenario = 'available';
  await page.route('**/api/v1/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (request.method() !== 'GET') { writes.push(`${request.method()} ${path}`); return route.abort(); }
    let data: unknown;
    if (path === '/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS };
    else if (path === '/affiliate/me') data = { enabled: false, identities: [], totalReferrals: 3, accruedAmountMinor: '120', availableBalanceMinor: null,
      currency: 'VND', withdrawalEnabled: false, subAffiliateEnabled: false,
      ...(scenario === 'missing' ? {} : { summary: scenario === 'available' ? summary : { ...summary, commissionStatus: 'unavailable', revenue: { ...summary.revenue, status: 'unavailable', complete: false, reason: 'SOURCE_SCAN_LIMIT_EXCEEDED' } } }) };
    else if (path === '/affiliate/performance') data = { items: [], page: 1, totalPages: 0 };
    else if (path.includes('notifications')) data = { items: [], total: 0, unreadCount: 0 };
    else { unknown.push(path); return route.abort(); }
    return route.fulfill({ json: { success: true, data, message: 'Synthetic read-only summary fixture' } });
  });
  for (scenario of ['available', 'unavailable', 'missing']) {
    await page.goto('/affiliate');
    for (const locale of ['vi', 'en', 'vi'] as const) {
      await page.locator('select').filter({ has: page.locator('option[value="vi"]') }).filter({ has: page.locator('option[value="en"]') }).selectOption(locale);
      await expect(page.locator('.affiliate-page__metrics article')).toHaveCount(8);
      const metrics = page.locator('[data-affiliate-summary]');
      await expect(metrics).toHaveCount(5);
      const amount = (value: string) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(BigInt(value));
      if (scenario === 'available') {
        await expect(page.locator('[data-affiliate-summary="revenue"] strong')).toHaveText(amount('9007199254740993'));
        await expect(page.locator('[data-affiliate-summary="today"] strong')).toHaveText(amount('-30'));
        await expect(page.locator('[data-affiliate-summary="month"] strong')).toHaveText(amount('0'));
      } else for (const kind of ['revenue', 'today', 'month']) {
        await expect(page.locator(`[data-affiliate-summary="${kind}"] strong`)).toHaveText(locale === 'vi' ? 'Chưa khả dụng' : 'Unavailable');
      }
      if (scenario !== 'missing') {
        await expect(page.locator('[data-affiliate-summary="ranking"] strong')).toHaveText(locale === 'vi' ? 'Chưa cấu hình' : 'Unconfigured');
        await expect(page.locator('[data-affiliate-summary="sub-affiliates"] strong')).toHaveText(locale === 'vi' ? 'Chưa bật' : 'Disabled');
        await expect(page.locator('.affiliate-page__summary-period time')).toHaveAttribute('datetime', summary.asOf);
        await expect(page.locator('.affiliate-page__summary-period')).toContainText('UTC');
      } else await expect(page.locator('.affiliate-page__summary-period')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  expect(writes).toEqual([]); expect(unknown).toEqual([]); expect(errors).toEqual([]);
});
