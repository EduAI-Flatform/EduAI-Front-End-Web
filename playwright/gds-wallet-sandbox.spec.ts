import { expect, test } from '@playwright/test';

const session = JSON.stringify({
  accessToken: 'sandbox-ui-test-token',
  refreshToken: '',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: {
    id: 'gds-ui-student', email: 'learner@example.com', fullName: 'Học viên GDS',
    status: 'active', roles: ['student'],
    createdAt: '2026-11-02T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z',
  },
});

for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
  test(`PAYW-04D wallet stays safe and responsive at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript((value) => window.localStorage.setItem('eduai.auth.session.v1', value), session);
    const writeCalls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/wallet/gds') && request.method() !== 'GET') writeCalls.push(request.url());
    });
    await page.route('**/api/v1/tmi/wallet', (route) => route.fulfill({
      contentType: 'application/json', status: 200,
      body: JSON.stringify({ success: true, data: { current: 1234, earned: 2000, spent: 766, expired: 0 } }),
    }));
    await page.route('**/api/v1/wallet/gds/topups/payos', (route) => route.fulfill({
      contentType: 'application/json', status: 201,
      body: JSON.stringify({ success: true, data: {
        topupId: 'gds-topup-1', amountMinor: '250000', currency: 'VND', transferMemo: 'G0AB12CD3',
        receivingAccount: 'VIRTUAL123456789012345678901234567890123', checkoutUrl: 'https://pay.payos.vn/web/payos-link-id',
        qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/ER8AAAAASUVORK5CYII=',
        expiresAt: '2026-11-02T12:15:00.000Z', status: 'AWAITING_TRANSFER', gdsCredited: false,
      } }),
    }));
    await page.route('**/api/v1/wallet/gds', (route) => route.fulfill({
      contentType: 'application/json', status: 200,
      body: JSON.stringify({
        success: true, message: 'ok',
        data: {
          available: true, mode: 'sandbox', state: 'READY_SANDBOX',
          balance: { settledMinor: '100000', reservedMinor: '25000', availableMinor: '75000', currency: 'VND' },
          topupEnabled: true, paymentEnabled: false,
          recentTransactions: [
            { id: 'journal-1', type: 'TOPUP_CREDIT', amountMinor: '100000', occurredAt: '2026-11-02T12:00:00.000Z' },
            { id: 'journal-2', type: 'RESERVE', amountMinor: '25000', occurredAt: '2026-11-02T12:01:00.000Z' },
          ],
        },
      }),
    }));

    await page.goto('/wallet/gds');
    await expect(page.getByRole('heading', { level: 1, name: 'Ví GDS' })).toBeVisible();
    await expect(page.getByText('75.000 ₫')).toBeVisible();
    await expect(page.getByText('1.234 điểm')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Đổi điểm thưởng TMI' })).toBeVisible();
    await expect(page.getByText('Nạp GDS đã xác minh')).toBeVisible();
    await expect(page.getByText('−25.000 ₫')).toBeVisible();
    await expect(page.getByRole('button', { name: /Tạo mã QR PayOS/ })).toBeEnabled();
    await expect(page.getByText('SANDBOX · CHƯA GIAO DỊCH THẬT')).toHaveCount(0);
    await page.getByLabel('Nhập số tiền chính xác muốn nạp (VND)').fill('250000');
    await expect(page.getByText(/Số tiền trên QR: 250.000 ₫/)).toBeVisible();
    await page.getByRole('button', { name: 'Tạo mã QR PayOS' }).click();
    await expect(page.getByRole('img', { name: /Mã QR PayOS cho yêu cầu nạp/ })).toBeVisible();
    await expect(page.getByText('G0AB12CD3')).toBeVisible();
    await expect(page.getByText('VIRTUAL123456789012345678901234567890123')).toBeVisible();
    await expect(page.getByRole('button', { name: /QR PayOS/ })).toBeDisabled();
    const sizes = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(sizes.body).toBeLessThanOrEqual(sizes.viewport + 1);
    expect(writeCalls).toHaveLength(1);
    expect(writeCalls[0]).toContain('/wallet/gds/topups/payos');
  });
}

test('PAYW-04D unavailable wallet system does not invent a zero balance', async ({ page }) => {
  await page.addInitScript((value) => window.localStorage.setItem('eduai.auth.session.v1', value), session);
  await page.route('**/api/v1/wallet/gds', (route) => route.fulfill({
    status: 404, contentType: 'application/json',
    body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'not found' } }),
  }));
  await page.goto('/wallet/gds');
  await expect(page.getByText('Hệ thống chưa cung cấp số dư Ví GDS cho tài khoản này.')).toBeVisible();
  await expect(page.getByText('0 ₫', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Tạo mã QR PayOS/ })).toBeEnabled();
});
