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

for (const mode of ['sandbox', 'production'] as const) {
for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
  test(`PAYW-04D ${mode} wallet stays safe and responsive at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript((value) => window.localStorage.setItem('eduai.auth.session.v1', value), session);
    let credited = false;
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
        topupId: '11111111-1111-4111-8111-111111111111', amountMinor: '250000', currency: 'VND', transferMemo: 'G0AB12CD3',
        receivingAccount: 'VIRTUAL123456789012345678901234567890123', checkoutUrl: 'https://pay.payos.vn/web/payos-link-id',
        qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/ER8AAAAASUVORK5CYII=',
        expiresAt: new Date(Date.now() + 900000).toISOString(), status: 'AWAITING_TRANSFER', gdsCredited: false,
      } }),
    }));
    await page.route(/\/api\/v1\/wallet\/gds(?:\?.*)?$/, (route) => route.fulfill({
      contentType: 'application/json', status: 200,
      body: JSON.stringify({
        success: true, message: 'ok',
        data: {
          available: true, mode, state: mode === 'production' ? 'READY_PRODUCTION' : 'READY_SANDBOX',
          balance: { settledMinor: '100000', reservedMinor: '25000', availableMinor: '75000', currency: 'VND' },
          topupEnabled: true, paymentEnabled: false,
          activeTopup: credited ? { topupId: '11111111-1111-4111-8111-111111111111', amountMinor: '250000', currency: 'VND', status: 'CREDITED', gdsCredited: true, creditedAt: new Date().toISOString() } : null,
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
    await expect(page.getByRole('button', { name: /Tạo mã QR PayOS/ })).toBeDisabled();
    await expect(page.getByText('SANDBOX · CHƯA GIAO DỊCH THẬT')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    if (width >= 1440) {
      const rows = await page.locator('.gds-wallet-page__quick-amounts button').evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().top)));
      expect(new Set(rows).size).toBe(1);
    }
    await page.getByLabel('Nhập số tiền chính xác muốn nạp (VND)').fill('250000');
    await expect(page.getByText(/Số tiền trên QR: 250.000 ₫/)).toBeVisible();
    await page.getByRole('button', { name: 'Tạo mã QR PayOS' }).click();
    await expect(page.getByRole('img', { name: /Mã QR PayOS cho yêu cầu nạp/ })).toBeVisible();
    await expect(page.getByText('G0AB12CD3')).toBeVisible();
    await expect(page.getByText('VIRTUAL123456789012345678901234567890123')).toBeVisible();
    await expect(page.locator('.gds-wallet-page__topup-card > button').first()).toBeDisabled();
    const sizes = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(sizes.body).toBeLessThanOrEqual(sizes.viewport + 1);
    expect(writeCalls).toHaveLength(1);
    expect(writeCalls[0]).toContain('/wallet/gds/topups/payos');
    await page.getByRole('button', { name: 'Về ví', exact: true }).click();
    await page.getByRole('button', { name: 'Xem QR đang chờ' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(writeCalls).toHaveLength(1);
    credited = true;
    await expect(page.getByRole('status').filter({ hasText: 'Nạp thành công' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('img', { name: /Mã QR PayOS/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Mua khóa học' })).toHaveAttribute('href', '/courses');
    await expect(page.getByRole('link', { name: 'Gói thành viên' })).toHaveAttribute('href', '/membership');
    const actionStyles = await page.locator('.gds-topup-dialog__actions > *').evaluateAll(nodes => nodes.map(node => ({ background: getComputedStyle(node).backgroundColor, height: node.getBoundingClientRect().height })));
    expect(new Set(actionStyles.map(style => style.background)).size).toBe(1);
    expect(new Set(actionStyles.map(style => style.height)).size).toBe(1);
    expect(await page.locator('.gds-topup-dialog__actions').evaluate(node => getComputedStyle(node).justifyContent)).toBe('center');
    await page.getByRole('button', { name: 'Về ví', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tạo mã QR PayOS' })).toBeEnabled();
    expect(writeCalls).toHaveLength(1);
  });
}

}

test('PAYW-04D unavailable wallet system does not invent a zero balance', async ({ page }) => {
  await page.addInitScript((value) => window.localStorage.setItem('eduai.auth.session.v1', value), session);
  await page.route(/\/api\/v1\/wallet\/gds(?:\?.*)?$/, (route) => route.fulfill({
    status: 404, contentType: 'application/json',
    body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'not found' } }),
  }));
  await page.goto('/wallet/gds');
  await expect(page.getByText('Hệ thống chưa cung cấp số dư Ví GDS cho tài khoản này.')).toBeVisible();
  await expect(page.getByText('0 ₫', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Tạo mã QR PayOS/ })).toBeDisabled();
});
