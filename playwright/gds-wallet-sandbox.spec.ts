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
    await page.route('**/api/v1/wallet/gds', (route) => route.fulfill({
      contentType: 'application/json', status: 200,
      body: JSON.stringify({
        success: true, message: 'ok',
        data: {
          available: true, mode: 'sandbox', state: 'READY_SANDBOX',
          balance: { settledMinor: '100000', reservedMinor: '25000', availableMinor: '75000', currency: 'VND' },
          topupEnabled: false, paymentEnabled: false,
        },
      }),
    }));

    await page.goto('/wallet/gds');
    await expect(page.getByRole('heading', { level: 1, name: 'Ví GDS' })).toBeVisible();
    await expect(page.getByText('75.000 ₫')).toBeVisible();
    await expect(page.getByRole('button', { name: /Tạo mã QR PayOS/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Nạp GDS/ })).toBeDisabled();
    await page.getByLabel('Nhập số tiền chính xác muốn nạp (VND)').fill('250000');
    await expect(page.getByText(/GDS nhận dự kiến: 250.000 ₫/)).toBeVisible();
    const sizes = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(sizes.body).toBeLessThanOrEqual(sizes.viewport + 1);
    expect(writeCalls).toEqual([]);
  });
}

test('PAYW-04D missing backend reports unavailable, never a fake zero balance', async ({ page }) => {
  await page.addInitScript((value) => window.localStorage.setItem('eduai.auth.session.v1', value), session);
  await page.route('**/api/v1/wallet/gds', (route) => route.fulfill({
    status: 404, contentType: 'application/json',
    body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'not found' } }),
  }));
  await page.goto('/wallet/gds');
  await expect(page.getByRole('alert')).toContainText('Máy chủ chưa cung cấp Ví GDS');
  await expect(page.getByText('0 ₫', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Tạo mã QR PayOS/ })).toBeDisabled();
});
