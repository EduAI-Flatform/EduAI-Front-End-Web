import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';
import type { AffiliateSummary } from '../src/services/affiliate.service';

const asOf = '2030-03-01T12:00:00.000Z';
const summary: AffiliateSummary = {
  asOf, timeZone: 'UTC', currency: 'VND', commissionBasis: 'recorded_signed_accruals', lifetimeCommissionMinor: '0', commissionStatus: 'available', commissionReason: null,
  today: { startsAt: '2030-03-01T00:00:00.000Z', endsBefore: asOf, amountMinor: '0' }, month: { startsAt: '2030-03-01T00:00:00.000Z', endsBefore: asOf, amountMinor: '0' },
  revenue: { status: 'available', amountMinor: '0', basis: 'net_verified_paid_after_recorded_refunds', complete: true, reason: null },
  ranking: { status: 'available', value: 2, reason: null, policyRevisionId: 'effective-ranking-rev', basis: 'recorded_referral_count', period: 'lifetime', tiePolicy: 'competition', asOf, startsAt: null, endsBefore: asOf, timeZone: 'UTC', complete: true },
  subAffiliates: { status: 'disabled', count: null, reason: 'SUB_AFFILIATE_POLICY_NOT_ENABLED' },
};
for (const width of [320, 375, 390, 412, 768, 1024, 1440]) test(`versioned ranking explicit Admin save-preview and owner read-only VI/EN ${width}`, async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [], unexpected: string[] = [], writes: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('gds.locale.v1', 'vi');
    localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-ranking', refreshToken: 'synthetic-refresh', tokenType: 'Bearer', expiresIn: 900,
      user: { id: 'synthetic-ranking-owner', fullName: 'Authored identity / Giữ nguyên', email: 'ranking@example.test', roles: ['platform_admin', 'instructor'], status: 'active' } }));
  });
  const { ranking: _ranking, ...legacyAffiliate } = DEFAULT_PLATFORM_SETTINGS.affiliate;
  const legacy = Object.freeze(legacyAffiliate), original = JSON.stringify(legacy);
  const revisions: Array<Record<string, unknown>> = [{ id: 'old-immutable', group: 'affiliate', content: legacy, version: 1, status: 'approved', createdAt: asOf, createdById: 'Authored admin', effectiveAt: null }];
  let scenario = 'available', incomplete = false;
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
    let data: unknown;
    if (request.method() === 'POST' && path === '/admin/platform/revisions') {
      writes.push(path); const draft = { ...request.postDataJSON(), id: `draft-${revisions.length}`, version: revisions.length + 1, status: 'draft', createdAt: asOf, createdById: 'Authored admin' };
      revisions.push(draft); data = draft;
    } else if (request.method() !== 'GET') { unexpected.push(`${request.method()} ${path}`); return route.abort(); }
    else if (path === '/platform/settings') data = { settings: {} };
    else if (path === '/admin/platform/settings') data = { settings: { ...DEFAULT_PLATFORM_SETTINGS, affiliate: legacy }, revisions, groups: Object.keys(DEFAULT_PLATFORM_SETTINGS), versions: {} };
    else if (/^\/admin\/platform\/revisions\/draft-\d+\/preview$/.test(path)) data = { revisionId: revisions.at(-1)!.id, group: 'affiliate', version: 2, before: legacy, after: revisions.at(-1)!.content, changed: true, preservesPurchasedAccess: true, canSchedule: !incomplete, blockers: incomplete ? ['RANKING_SOURCE_SCAN_LIMIT_EXCEEDED'] : [], membershipImpact: null,
      rankingImpact: { beforeRevisionId: 'old-immutable', afterRevisionId: revisions.at(-1)!.id, asOf, timeZone: 'UTC', examinedParticipants: incomplete ? null : 3, newlyRanked: incomplete ? null : 3, removedParticipants: incomplete ? null : 0, changedRanks: incomplete ? null : 0, unchangedRanks: incomplete ? null : 0, complete: !incomplete, comparable: !incomplete, exceptions: incomplete ? [{ side: 'before', reason: 'RANKING_SOURCE_SCAN_LIMIT_EXCEEDED', count: 1 }] : [], activationReady: !incomplete, activationBlockers: incomplete ? ['RANKING_SOURCE_SCAN_LIMIT_EXCEEDED'] : [] } };
    else if (path === '/affiliate/me') data = { enabled: false, policyRevisionId: 'financial-disabled', identities: [], totalReferrals: 0, accruedAmountMinor: '0', currency: 'VND', availableBalanceMinor: null, withdrawalEnabled: false, walletCreditStatus: 'PROCESSING_DISABLED', subAffiliateEnabled: false,
      summary: { ...summary, ranking: scenario === 'available' ? summary.ranking : scenario === 'legacy' ? { status: 'unconfigured', value: null, reason: 'RANKING_POLICY_NOT_CONFIGURED' } : { ...summary.ranking, value: null, status: scenario, reason: scenario === 'unavailable' ? 'RANKING_SOURCE_SCAN_LIMIT_EXCEEDED' : scenario === 'not_participating' ? 'RANKING_NOT_PARTICIPATING' : 'RANKING_DISABLED' } } };
    else if (path === '/affiliate/performance') data = { items: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
    else if (path === '/wallet/gds') data = { available: false, mode: 'disabled', state: 'DISABLED', balance: null, debtMinor: null, withdrawalEnabled: false, paymentEnabled: false, topupEnabled: false };
    else if (path.includes('notifications')) data = { items: [], total: 0, unreadCount: 0 };
    else { unexpected.push(path); return route.abort(); }
    return route.fulfill({ json: { success: true, data } });
  });
  const language = (locale: string) => page.locator('select').filter({ has: page.locator('option[value="vi"]') }).filter({ has: page.locator('option[value="en"]') }).selectOption(locale);
  const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto('/admin/dashboard/platform-settings?group=affiliate');
  await page.locator('.platform-settings__revision').click();
  await language('en');
  const enabled = page.getByRole('checkbox', { name: 'Enable ranking report' });
  await expect(enabled).toBeDisabled();
  await page.getByRole('combobox', { name: 'Ranking basis', exact: true }).selectOption('recorded_referral_count');
  await page.getByRole('combobox', { name: 'Ranking period', exact: true }).selectOption('lifetime');
  await expect(enabled).toBeDisabled();
  await page.getByRole('combobox', { name: 'Tie policy', exact: true }).selectOption('competition');
  await enabled.check();
  await page.getByRole('button', { name: 'Save new draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preview impact', exact: true })).toBeEnabled();
  expect(revisions.at(-1)!.content).toMatchObject({ enabled: false, fundingSource: 'unconfigured', ranking: { enabled: true, basis: 'recorded_referral_count', period: 'lifetime', tiePolicy: 'competition' } });
  for (incomplete of [false, true]) {
    await page.getByRole('button', { name: 'Preview impact', exact: true }).click();
    for (const locale of ['vi', 'en'] as const) {
      await language(locale);
      await expect(page.locator('[data-ranking-impact]')).toContainText(locale === 'vi' ? `Mới được xếp hạng: ${incomplete ? 'Chưa xác định' : '3'}` : `Newly ranked: ${incomplete ? 'Unknown' : '3'}`);
      await expect(page.locator('[data-ranking-impact]')).toContainText('old-immutable');
      await expect(page.locator('[data-ranking-impact]')).not.toContainText('RANKING_'); await fits();
    }
  }
  for (scenario of ['available', 'disabled', 'not_participating', 'unavailable', 'legacy']) {
    await page.goto('/affiliate');
    for (const locale of ['vi', 'en'] as const) {
      await language(locale);
      const labels = locale === 'vi' ? ['#2', 'Chưa bật', 'Chưa tham gia xếp hạng', 'Chưa khả dụng', 'Chưa cấu hình'] : ['#2', 'Disabled', 'Not participating', 'Unavailable', 'Unconfigured'];
      await expect(page.locator('[data-affiliate-summary="ranking"] strong')).toHaveText(labels[['available', 'disabled', 'not_participating', 'unavailable', 'legacy'].indexOf(scenario)]);
      await expect(page.locator('[data-affiliate-summary="ranking"]')).not.toContainText('RANKING_'); await fits();
      if (scenario === 'available' && locale === 'en' && width === 390) await page.screenshot({ path: test.info().outputPath('ranking-en-390.png'), fullPage: true });
    }
  }
  expect(JSON.stringify(legacy)).toBe(original); expect(writes).toEqual(['/admin/platform/revisions']); expect(unexpected).toEqual([]); expect(errors).toEqual([]);
});
