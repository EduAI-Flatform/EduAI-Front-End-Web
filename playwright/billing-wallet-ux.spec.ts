import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';
const now = '2026-11-20T04:00:00Z';
const user = { id: 'ux-owner', email: 'ux@example.invalid', fullName: 'UX Test', roles: ['student'], status: 'active', createdAt: now, updatedAt: now };
const session = { user, accessToken: 'synthetic-ux-access', refreshToken: 'synthetic-ux-refresh', tokenType: 'Bearer', expiresIn: 3600 };
const money = { amountMinor: '250000', currency: 'VND' };
const orders = ['PENDING_PAYMENT','CONFIRMED','CANCELLED','EXPIRED','LATE_PAYMENT_REVIEW','LATE_PAYMENT_REFUNDED'].map((status,index) => ({
  id: 'order-' + index, orderNumber: 'GDS-2026-00' + index, status, createdAt: now, confirmedAt: status === 'CONFIRMED' ? now : null,
  lines: [{ title: 'Machine Learning with Python', quantity: 1 }], payable: money,
}));
const enrollments = [0, 50, 100].map((progress, index) => ({
  id: 'enrollment-' + index, status: progress === 100 ? 'completed' : 'active', enrolledAt: now, completedAt: progress === 100 ? now : null,
  courseId: 'course-' + index, course: { id: 'course-' + index, title: 'Course ' + index, level: 'beginner', description: 'Synthetic learning course', thumbnailUrl: null },
  progress: { progressPercent: progress, completedLessons: progress / 25, totalLessons: 4 },
}));
async function fixture(page: Page) {
  let enrollCalls = 0;
  const exports: URL[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(value => {
    localStorage.setItem('gds.locale.v1', 'en');
    localStorage.setItem('eduai.auth.session.v1', JSON.stringify(value));
  }, session);
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname.replace(/^.*\/api\/v1/, '');
    let data: unknown = { items: [], unreadCount: 0 };
    if (path === '/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS };
    else if (path === '/auth/me') data = user;
    else if (path === '/auth/security') data = { passwordMode: 'local', firebaseUid: null };
    else if (path === '/auth/mfa/status') data = { available: true, enabled: false, recoveryCodesRemaining: 0 };
    else if (path === '/auth/oauth/providers') data = { google: false, facebook: false, zalo: false };
    else if (path === '/auth/mfa/enroll') {
      enrollCalls++;
      if (enrollCalls === 1) return route.fulfill({ status: 401, json: { success: false, error: { code: 'MFA_REAUTHENTICATION_REQUIRED', message: 'Recent verification required' } } });
      data = { secret: 'SYNTHETICSETUPKEY', otpauthUri: 'otpauth://totp/GDS:test?secret=SYNTHETICSETUPKEY', expiresAt: '2099-01-01T00:00:00Z' };
    } else if (path === '/auth/login') data = { ...session, accessToken: 'synthetic-fresh-access' };
    else if (path.endsWith('/export')) {
      exports.push(url);
      data = { filename: 'report.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dataBase64: Buffer.from('PK\x03\x04synthetic').toString('base64'), exported: 6, complete: true, scope: 'filtered_history', filter: url.searchParams.get('filter'), asOf: now };
    } else if (path === '/commerce/orders') {
      const items = orders.filter(order => !url.searchParams.get('status') || order.status.toLowerCase() === url.searchParams.get('status'));
      data = { items, total: items.length, totalPages: 1, page: 1, pageSize: 20 };
    } else if (path === '/platform/support') data = { items: [{ id: 'invoice-1', orderId: 'order-1', orderNumber: 'GDS-2026-001', title: 'Invoice GDS-2026-001', status: 'in_progress', createdAt: now, updatedAt: now, invoiceDetails: { recipientName: 'Synthetic Academy', invoiceEmail: 'invoice@example.invalid' } }], total: 1, totalPages: 1 };
    else if (path === '/wallet/gds') data = { available: true, state: 'READY_PRODUCTION', mode: 'production', balance: { settledMinor:'500000',availableMinor:'500000',reservedMinor:'0',currency:'VND' }, topupEnabled:true,paymentEnabled:true,withdrawalEnabled:true,totalDepositedMinor:'750000',totalPaidMinor:'250000',totalWithdrawnMinor:'0',debtMinor:'0',income:null,recentTransactions:[] };
    else if (path === '/wallet/gds/transactions') data = { items: [{ id:'journal-1',type:'TOPUP_CREDIT',amountMinor:'500000',occurredAt:now }], hasMore:false,nextCursor:null };
    else if (path.endsWith('/withdrawal-settings')) data = { minimumMinor:'10000',maximumMinor:'10000000',version:1,admissionEnabled:true,processingEnabled:true };
    else if (path === '/tmi/wallet') data = { current: 20, earned: 20, spent: 0, expired: 0 };
    else if (path === '/me/enrollments') data = enrollments;
    return route.fulfill({ status: 200, json: { success: true, data } });
  });
  return { exports, errors };
}
for (const width of [320, 768, 1024, 1440]) test('billing, wallet, learning and inline verification at ' + width, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const state = await fixture(page);
  await page.goto('/billing');
  await expect(page.locator('.billing-order')).toHaveCount(6);
  await expect(page.locator('.billing-badge--cancelled')).toHaveText('Cancelled');
  await expect(page.locator('.billing-badge--expired')).toHaveText('Expired');
  await page.screenshot({ path: test.info().outputPath('billing-' + width + '.png'), fullPage: true });
  await page.getByRole('button', { name: 'Cancelled', exact: true }).click();
  await expect(page.locator('.billing-order')).toHaveCount(1);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Excel', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/gds-orders.*\.xlsx$/);
  expect(state.exports[0].searchParams.get('status')).toBe('cancelled');
  await page.getByRole('button', { name: 'Invoice requests', exact: true }).click();
  await expect(page.getByText('Synthetic Academy')).toBeVisible();
  await expect(page.locator('.billing-badge--in_progress')).toHaveText('In progress');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.goto('/wallet/gds');
  await expect(page.locator('.gds-history-list li')).toHaveCount(1);
  await page.getByLabel('Start date', { exact: true }).fill('2026-11-01');
  await page.getByLabel('End date', { exact: true }).fill('2026-11-20');
  const walletDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Excel for this filter' }).click();
  await walletDownload;
  expect(state.exports.at(-1)?.searchParams.get('startDate')).toBe('2026-11-01');
  await page.screenshot({ path: test.info().outputPath('wallet-' + width + '.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.goto('/dashboard/learning');
  await expect(page.locator('.my-course-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Completed 1' }).click();
  await expect(page.locator('.my-course-card')).toHaveCount(1);
  await expect(page.locator('.my-course-card h2')).toHaveText('Course 2');
  await page.screenshot({ path: test.info().outputPath('learning-' + width + '.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Set up authenticator' }).click();
  const dialog = page.getByRole('dialog', { name: 'Verify to continue' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Password', { exact: true }).fill('synthetic-test-password');
  await page.screenshot({ path: test.info().outputPath('mfa-' + width + '.png'), fullPage: true });
  await dialog.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show setup key' })).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(state.errors).toEqual([]);
});
