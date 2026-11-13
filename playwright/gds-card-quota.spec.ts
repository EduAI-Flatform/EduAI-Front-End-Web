import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';

test('Admin edits dynamic tiers and exact quota strings in VI/EN across required widths', async ({ page }) => {
  const settings = structuredClone(DEFAULT_PLATFORM_SETTINGS);
  const revisions: Record<string, unknown>[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.name));
  await page.addInitScript(() => {
    if (!localStorage.getItem('gds.locale.v1')) localStorage.setItem('gds.locale.v1', 'en');
    localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-admin-access', refreshToken: 'synthetic-admin-refresh',
      expiresIn: 900, tokenType: 'Bearer', user: { id: '10000000-0000-4000-8000-000000000001', email: 'synthetic@example.test',
        fullName: 'Synthetic Admin', status: 'active', roles: ['platform_admin'] } }));
  });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let data: unknown = { items: [], unreadCount: 0 };
    if (path === '/platform/settings') data = { settings };
    if (path === '/admin/platform/settings') data = { settings, groups: Object.keys(settings), versions: {}, revisions,
      cardServiceCapabilities: { supportedOperations: ['AI_CHAT'], schemaReady: true, activationReady: false,
        definitions: [{ id: '00000000-0000-4000-8000-000000000003', code: 'AI_CHAT', displayName: 'Synthetic Chat',
          valueType: 'metered', resetPeriod: 'calendar_month', unitLabel: 'request', executable: true }] } };
    if (path === '/admin/platform/revisions' && route.request().method() === 'POST') {
      const input = route.request().postDataJSON();
      const row = { ...input, id: '20000000-0000-4000-8000-000000000001', status: 'draft', version: 1,
        createdById: 'synthetic-admin', createdAt: '2026-11-13T00:00:00Z', effectiveAt: null };
      revisions.push(row); data = row;
    }
    if (path.endsWith('/preview')) {
      const revision = revisions[0];
      const quota = { definitionId: '00000000-0000-4000-8000-000000000003', code: 'AI_CHAT', resetPeriod: 'calendar_month',
        quota: '5', consumed: '2', remaining: '3', overLimit: false, periodStartsAt: '2026-11-01T00:00:00Z', periodEndsAt: '2026-12-01T00:00:00Z' };
      data = { revisionId: revision.id, group: 'membership', version: 1, changed: true, before: settings.membership,
        after: revision.content, canSchedule: false, blockers: ['CARD_SERVICE_LIMIT_RUNTIME_NOT_IMPLEMENTED'], preservesPurchasedAccess: true,
        cardServiceBindings: { ready: true, issues: [] }, membershipImpact: { status: 'evaluated', reason: null,
          policyRevisionId: revision.id, evaluatedUsers: 1, totalUsers: 1, projectedChangesOnPage: 0, projectedBenefitChangesOnPage: 0,
          projectedServiceLimitChangesOnPage: 1, projectedServiceRemainingChangesOnPage: 1, serviceConsumptionProjected: true,
          serviceLimitImpactScope: 'consumption_included', serviceConsumptionProjectionIssues: [], nextCursor: null, complete: true,
          items: [{ userId: 'synthetic-learner', previousTierCode: 'member', previousServiceQuota: [quota],
            projectedServiceQuota: [{ ...quota, quota: '9223372036854775807', remaining: '9223372036854775805' }],
            evaluation: { status: 'evaluated', reason: null, basis: 'spend', policyRevisionId: revision.id, qualifyingAmountMinor: '0',
              currency: 'VND', tier: settings.membership.tiers[0], windowStartsAt: null, windowEndsAt: null, evaluatedAt: null } }] } };
    }
    await route.fulfill({ json: { success: true, data, message: 'ok' } });
  });
  await page.goto('/admin/dashboard/platform-settings?group=membership');
  const member = page.getByRole('group', { name: 'Member Card', exact: true });
  await member.getByRole('button', { name: 'Add service quota' }).click();
  await member.getByRole('combobox', { name: 'Service', exact: true }).selectOption('00000000-0000-4000-8000-000000000003');
  await member.getByRole('textbox', { name: 'Request quota' }).fill('9223372036854775807');
  await expect(member.getByText('Calendar month (UTC)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add card tier' }).click();
  const added = page.locator('.membership-policy-form__tier').last();
  await added.getByRole('textbox', { name: 'Code', exact: true }).fill('diamond');
  await added.getByRole('textbox', { name: 'Vietnamese', exact: true }).fill('Hạng kiểm thử');
  await added.getByRole('textbox', { name: 'English', exact: true }).fill('Synthetic Diamond');
  await added.getByRole('spinbutton', { name: 'Qualification threshold' }).fill('300');
  await page.getByRole('button', { name: 'Save new draft' }).click();
  await expect(page.locator('.platform-settings__revision')).toHaveCount(1);
  const saved = revisions[0].content as { tiers: Array<{ code: string; serviceLimits?: Array<{ quota: string }> }> };
  expect(saved.tiers).toHaveLength(4);
  expect(saved.tiers[0].serviceLimits?.[0].quota).toBe('9223372036854775807');
  expect(saved.tiers[3].code).toBe('diamond');
  await expect(page.getByRole('button', { name: 'Preview impact' })).toBeEnabled();
  await page.getByRole('button', { name: 'Preview impact' }).click();
  const comparison = page.getByRole('region', { name: 'Service quota impact', exact: true });
  await expect(comparison.getByRole('group', { name: 'Before', exact: true })).toContainText('3');
  await expect(comparison.getByRole('group', { name: 'After', exact: true })).toContainText('9,223,372,036,854,775,805');
  await expect(page.getByText('Service quota activation is not available yet.', { exact: true })).toBeVisible();
  for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390 || width === 1440) await comparison.screenshot({ path: test.info().outputPath(`card-impact-en-${width}.png`) });
  }
  await member.getByRole('textbox', { name: 'Request quota' }).fill('9223372036854775808');
  expect(await member.getByRole('textbox', { name: 'Request quota' }).evaluate(input => (input as HTMLInputElement).checkValidity())).toBe(false);
  await expect(page.getByRole('button', { name: 'Preview impact' })).toBeDisabled();
  await page.getByRole('button', { name: 'Save new draft' }).click();
  expect(revisions).toHaveLength(1);
  await member.getByRole('textbox', { name: 'Request quota' }).fill('9223372036854775807');
  await member.getByRole('textbox', { name: 'Request quota' }).press('Tab');
  await expect(member.getByRole('button', { name: 'Remove quota' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Preview impact' })).toBeEnabled();
  await page.evaluate(() => localStorage.setItem('gds.locale.v1', 'vi'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Thêm hạng thẻ' })).toBeVisible();
  await page.locator('.platform-settings__revision').first().click();
  await page.getByRole('button', { name: 'Xem trước ảnh hưởng' }).click();
  const viComparison = page.getByRole('region', { name: 'Ảnh hưởng hạn mức dịch vụ', exact: true });
  await expect(viComparison.getByRole('group', { name: 'Sau', exact: true })).toContainText('9.223.372.036.854.775.805');
  for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390 || width === 1440) await viComparison.screenshot({ path: test.info().outputPath(`card-impact-vi-${width}.png`) });
  }
  expect(errors).toEqual([]);
});
