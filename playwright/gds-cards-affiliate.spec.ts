import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';
const widths = [320, 375, 390, 412, 768, 1024, 1440];
for (const width of widths) test('cards and referral honest states at ' + width, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => localStorage.setItem('eduai.auth.session.v1', JSON.stringify({
    accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', expiresIn: 900, tokenType: 'Bearer',
    user: { id: '10000000-0000-4000-8000-000000000001', fullName: 'GDS Test', email: 'gds@example.test', roles: ['student'], status: 'active' },
  })));
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let data: unknown = {};
    if (path === '/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS };
    if (path === '/membership-cards/me') data = {
      policy: DEFAULT_PLATFORM_SETTINGS.membership,
      evaluation: { status: 'disabled', tier: null, qualifyingAmountMinor: null, policyRevisionId: null },
      legacyPurchasedAccessPreserved: true, entitlementMigrationApplied: false,
    };
    if (path === '/affiliate/me') data = { enabled: false, policyRevisionId: null, totalReferrals: 0, identities: [], accruedAmountMinor: '0', currency: 'VND',
      availableBalanceMinor: null, withdrawalEnabled: false, walletCreditStatus: 'ADAPTER_NOT_VERIFIED', subAffiliateEnabled: false };
    if (path === '/affiliate/performance') data = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };
    if (path === '/wallet/gds') data = { available: true, mode: 'sandbox', state: 'READY_SANDBOX', balance: { settledMinor: '1000000', reservedMinor: '0', availableMinor: '1000000', currency: 'VND' }, debtMinor: '0', withdrawalEnabled: true, paymentEnabled: false, topupEnabled: false };
    if (path === '/wallet/gds/withdrawal-settings') data = { minimumMinor: '10000', maximumMinor: '10000000', version: 1, admissionEnabled: true, processingEnabled: true, accountVerificationRequired: false, accountVerificationAvailable: false };
    if (path === '/wallet/gds/withdrawals') data = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 };
    if (path === '/wallet/gds/banks') data = { banks: [], stale: false, verificationRequired: false, verificationAvailable: false };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, message: 'ok' }) });
  });
  await page.goto('/membership-cards');
  await expect(page.getByText('Chính sách thẻ chưa được áp dụng')).toBeVisible();
  await expect(page.getByText('Ngưỡng xét hạng chưa được áp dụng')).toHaveCount(3);
  await expect(page.getByText('Quyền học đã mua được giữ nguyên.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (width === 390 || width === 1440) await page.screenshot({ path: test.info().outputPath('cards-' + width + '.png'), fullPage: true });
  await page.goto('/affiliate');
  await expect(page.getByText('Chương trình referral chưa được mở.')).toBeVisible();
  await expect(page.getByText('Chưa khả dụng', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo mã referral' })).toBeDisabled();
  await page.getByRole('button', { name: 'Hiệu quả tiếp thị liên kết' }).click();
  await expect(page.getByText('Chưa có referral được ghi nhận.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xuất Excel trang hiện tại' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (width === 390 || width === 1440) await page.screenshot({ path: test.info().outputPath('affiliate-' + width + '.png'), fullPage: true });
  await page.getByRole('button', { name: 'Rút tiền', exact: true }).click();
  await page.locator('.gds-withdrawal-action').getByRole('button', { name: 'Rút tiền', exact: true }).click();
  await expect(page.getByLabel('Số tiền rút (VND)')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('dialog').screenshot({ path: test.info().outputPath('affiliate-withdraw-' + width + '.png') });
  expect(errors).toEqual([]);
});
