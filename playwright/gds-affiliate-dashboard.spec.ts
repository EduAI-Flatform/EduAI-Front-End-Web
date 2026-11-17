import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';
import { affiliateDashboardQr } from './fixtures/affiliate-dashboard-qr';

// Source-shaped historical fixtures, not financial/commission eligibility evidence.
const codes = ['0123456789abcdef0123456789abcd', 'abcdef0123456789abcdef01234567'];
const identities = codes.map((code, index) => ({ id: `identity-ugc-${index}`, kind: index ? 'instructor' : 'general', status: 'active', code,
  referralUrl: `https://referrals.example.test/?ref=${code}`, qrCodeDataUrl: affiliateDashboardQr[index] }));
const sourceState = { enabled: false, policyRevisionId: 'revision-ugc-KHÔNG-DỊCH', identities, totalReferrals: 3,
  accruedAmountMinor: '-5000', currency: 'VND', availableBalanceMinor: null, heldBalanceMinor: null, debtMinor: null,
  withdrawalEnabled: false, walletCreditStatus: 'PROCESSING_DISABLED', subAffiliateEnabled: false, balanceScope: 'GDS_WALLET' };
const rows = [
  { id: 'row-positive', userName: 'Người dùng Giữ nguyên / Keep original', orderNumber: 'ORDER-UGC-VI-EN-001', kind: 'general', accruedAmountMinor: '75000' },
  { id: 'row-refund', userName: 'Refund correction / Hoàn tiền', orderNumber: 'ORDER-UGC-VI-EN-002', kind: 'instructor', accruedAmountMinor: '-80000' },
].map(row => ({ ...row, createdAt: '2026-11-01T10:00:00.000Z', orderStatus: 'confirmed', policyRevisionId: sourceState.policyRevisionId,
  holdUntil: null, currency: 'VND', walletCreditStatus: 'PROCESSING_DISABLED' }));

for (const locale of ['vi', 'en'] as const) for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
  test(`affiliate signed dashboard / withdraw / performance ${locale} ${width}`, async ({ page }) => {
    const writes: string[] = [], unexpected: string[] = [], errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(locale => {
      localStorage.setItem('gds.locale.v1', locale);
      localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', expiresIn: 900, tokenType: 'Bearer',
        user: { id: 'synthetic-dashboard-owner', fullName: 'Dashboard fixture', email: 'dashboard@example.test', roles: ['instructor'], status: 'active' } }));
      // Never touches the machine clipboard. Only this isolated browser context records copied values.
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => {
        (window as unknown as { copiedReferralLinks: string[] }).copiedReferralLinks ??= [];
        (window as unknown as { copiedReferralLinks: string[] }).copiedReferralLinks.push(text);
      } } });
    }, locale);
    const sourceBefore = JSON.stringify({ sourceState, rows });
    await page.route('**/api/v1/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
      if (request.method() !== 'GET') { writes.push(`${request.method()} ${path}`); return route.abort(); }
      let data: unknown;
      if (path === '/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS };
      else if (path === '/affiliate/me') data = sourceState;
      else if (path === '/affiliate/performance') data = { items: rows, total: 2, page: 1, pageSize: 25, totalPages: 1 };
      else if (path === '/wallet/gds') data = { available: false, mode: 'disabled', state: 'DISABLED', balance: null, debtMinor: null,
        withdrawalEnabled: false, paymentEnabled: false, topupEnabled: false };
      else if (path === '/wallet/gds/withdrawal-settings') data = { minimumMinor: '10000', maximumMinor: '10000000', version: 1,
        admissionEnabled: false, processingEnabled: false, accountVerificationRequired: false, accountVerificationAvailable: false };
      else if (path === '/wallet/gds/transactions') data = { items: [], hasMore: false, nextCursor: null };
      else if (path.includes('notifications')) data = { items: [], total: 0, unreadCount: 0 };
      else { unexpected.push(path); return route.abort(); }
      return route.fulfill({ json: { success: true, data, message: 'Synthetic read-only acceptance fixture' } });
    });
    await page.goto('/affiliate');
    const content = page.locator('.affiliate-page');
    const tabs = content.locator('.affiliate-page__tabs button');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toHaveText(locale === 'vi' ? 'Bảng điều khiển' : 'Dashboard');
    await expect(tabs.nth(1)).toHaveText(locale === 'vi' ? 'Rút tiền' : 'Withdraw');
    await expect(tabs.nth(2)).toHaveText(locale === 'vi' ? 'Hiệu quả tiếp thị liên kết' : 'Affiliate Performance');
    const money = (value: string) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(BigInt(value));
    const overflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(content.getByText(locale === 'vi' ? 'Chương trình referral chưa được mở.' : 'The referral program is not open yet.', { exact: true })).toBeVisible();
    const metrics = content.locator('.affiliate-page__metrics strong');
    await expect(metrics.nth(0)).toHaveText('3');
    await expect(metrics.nth(1)).toHaveText(money('-5000'));
    await expect(metrics.nth(2)).toHaveText(locale === 'vi' ? 'Chưa khả dụng' : 'Unavailable');
    const identityPanels = content.locator('.affiliate-page__identity');
    await expect(identityPanels).toHaveCount(2);
    for (const [index, identity] of identities.entries()) {
      const panel = identityPanels.nth(index);
      await expect(panel.locator('input').nth(0)).toHaveValue(identity.referralUrl);
      await expect(panel.locator('input').nth(1)).toHaveValue(identity.code);
      await expect(panel.locator('img')).toHaveAttribute('src', identity.qrCodeDataUrl);
      await expect(panel.locator('img')).toHaveAccessibleName(locale === 'vi' ? 'Mã QR liên kết referral' : 'Referral link QR code');
      await expect.poll(() => panel.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      await panel.getByRole('button').click();
    }
    expect(identities[0].qrCodeDataUrl).not.toBe(identities[1].qrCodeDataUrl);
    expect(await page.evaluate(() => (window as unknown as { copiedReferralLinks: string[] }).copiedReferralLinks)).toEqual(identities.map(row => row.referralUrl));
    await overflow();
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(content.getByText(locale === 'vi' ? 'Xử lý ghi có và rút tiền đang tạm đóng.' : 'Wallet credit and withdrawals are currently paused.', { exact: true })).toBeVisible();
    await expect(content.locator('.gds-withdrawal-action-cta')).toBeDisabled();
    await expect(content.getByRole('link', { name: locale === 'vi' ? 'Mở ví GDS' : 'Open GDS wallet' })).toHaveAttribute('href', '/wallet/gds');
    await expect(content.locator('[role="alert"]')).toHaveCount(0);
    await overflow();
    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveAttribute('aria-pressed', 'true');
    for (const [index, row] of rows.entries()) {
      const record = content.locator('.affiliate-page__records article').nth(index);
      await expect(record.getByRole('heading')).toHaveText(row.userName);
      await expect(record).toContainText(row.orderNumber);
      await expect(record).toContainText(row.policyRevisionId);
      await expect(record).toContainText(money(row.accruedAmountMinor));
      await expect(record).toContainText(locale === 'vi' ? index ? 'Giảng viên' : 'Thông thường' : index ? 'Instructor' : 'General');
    }
    await overflow();
    await tabs.nth(0).click();
    await expect(metrics.nth(1)).toHaveText(money('-5000'));
    expect(JSON.stringify({ sourceState, rows })).toBe(sourceBefore);
    expect(writes).toEqual([]); expect(unexpected).toEqual([]); expect(errors).toEqual([]);
  });
}
