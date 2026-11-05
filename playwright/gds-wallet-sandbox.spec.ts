import { expect, test } from '@playwright/test';
import { guardRuntime } from './runtime-guards';

const session = JSON.stringify({
  accessToken: 'sandbox-ui-test-token',
  refreshToken: '',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: {
    id: 'gds-ui-student', email: 'learner@example.com', fullName: 'Học viên GDS',
    status: 'active', roles: ['student', 'instructor'],
    createdAt: '2026-11-02T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z',
  },
});

for (const mode of ['sandbox', 'production'] as const) {
for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
  test(`PAYW-04D ${mode} wallet stays safe and responsive at ${width}px`, async ({ page }) => {
    const runtime = guardRuntime(page);
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
          topupEnabled: true, paymentEnabled: false, paymentHeldMinor: '15000', withdrawalHeldMinor: '10000', totalWithdrawnMinor: '350000', debtMinor: '0',
          income: { status: 'READY', totalMinor: '140000', recognizedMinor: '100000', pendingMinor: '40000', reviewPendingMinor: '0' },
          activeTopup: credited ? { topupId: '11111111-1111-4111-8111-111111111111', amountMinor: '250000', currency: 'VND', status: 'CREDITED', gdsCredited: true, creditedAt: new Date().toISOString() } : null,
          recentTransactions: [
            { id: 'journal-1', type: 'TOPUP_CREDIT', amountMinor: '100000', occurredAt: '2026-11-02T12:00:00.000Z' },
            { id: 'journal-2', type: 'RESERVE', amountMinor: '25000', occurredAt: '2026-11-02T12:01:00.000Z' },
          ],
        },
      }),
    }));

    await page.goto('/wallet/gds');
    await expect(page.getByRole('heading', { level: 1, name: 'Ví của tôi' })).toBeVisible();
    await expect(page.getByText('75.000 ₫')).toBeVisible();
    await expect(page.getByText('1.234 điểm')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Đổi điểm thưởng TMI' })).toBeVisible();
    await expect(page.getByText('Nạp GDS đã xác minh')).toBeVisible();
    await expect(page.getByText('25.000 ₫').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nạp tiền', exact: true })).toBeEnabled();
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByText('Đang giữ cho thanh toán')).toBeVisible();
    await expect(page.getByText('Đang chờ rút')).toBeVisible();
    await expect(page.getByText('140.000 ₫')).toBeVisible();
    await expect(page.getByText('350.000 ₫')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('overview-' + mode + '-' + width + '.png'), fullPage: true });
    await page.getByRole('button', { name: 'Nạp tiền', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Tạo mã QR', exact: true })).toBeDisabled();
    await expect(page.getByText('SANDBOX · CHƯA GIAO DỊCH THẬT')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    await page.getByLabel('Số tiền nạp (VND)').fill('250000');
    await expect(page.locator('.gds-topup-entry__total strong')).toHaveText('250.000 ₫');
    await page.getByRole('button', { name: 'Tạo mã QR' }).click();
    await expect(page.getByRole('img', { name: /Mã QR cho yêu cầu nạp/ })).toBeVisible();
    await expect(page.getByText('G0AB12CD3')).toBeVisible();
    await expect(page.getByText('VIRTUAL123456789012345678901234567890123')).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
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
    await expect(page.getByRole('img', { name: /Mã QR/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Mua khóa học' })).toHaveAttribute('href', '/courses');
    await expect(page.getByRole('link', { name: 'Gói thành viên' })).toHaveAttribute('href', '/membership');
    const actionStyles = await page.locator('.gds-topup-dialog__actions > *').evaluateAll(nodes => nodes.map(node => ({ background: getComputedStyle(node).backgroundColor, height: node.getBoundingClientRect().height })));
    expect(new Set(actionStyles.map(style => style.background)).size).toBe(1);
    expect(new Set(actionStyles.map(style => style.height)).size).toBe(1);
    expect(await page.locator('.gds-topup-dialog__actions').evaluate(node => getComputedStyle(node).justifyContent)).toBe('center');
    await page.getByRole('button', { name: 'Về ví', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Nạp tiền', exact: true })).toBeEnabled();
    expect(writeCalls).toHaveLength(1);
    await runtime.assertClean();
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
  await expect(page.getByRole('button', { name: 'Nạp tiền', exact: true })).toBeDisabled();
});

for (const width of [375, 1440]) test(`wallet loading, empty, unavailable income and locked states at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 });
  await page.addInitScript(value => localStorage.setItem('eduai.auth.session.v1', value), session);
  let release: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let state: 'loading' | 'income-error' | 'empty' | 'locked' = 'loading';
  const runtime = guardRuntime(page);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    expect(route.request().method()).toBe('GET');
    if (path.endsWith('/wallet/gds')) {
      if (state === 'loading') await pending;
      if (state === 'error') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'UNAVAILABLE', message: 'temporarily unavailable' } }) });
      const locked = state === 'locked';
      const empty = state === 'empty';
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {
        available: !locked, mode: 'production', state: locked ? 'SUSPENDED' : 'READY_PRODUCTION',
        balance: locked ? null : { availableMinor: empty ? '0' : '75000', settledMinor: empty ? '0' : '100000', reservedMinor: empty ? '0' : '25000', currency: 'VND' },
        topupEnabled: !locked, paymentEnabled: !locked, paymentHeldMinor: empty ? '0' : '15000', withdrawalHeldMinor: empty ? '0' : '10000', totalWithdrawnMinor: '0', debtMinor: '0',
        income: state === 'income-error' ? { status: 'UNAVAILABLE', totalMinor: null, recognizedMinor: null, pendingMinor: null, reviewPendingMinor: null }
          : { status: 'READY', totalMinor: '0', recognizedMinor: '0', pendingMinor: '0', reviewPendingMinor: '0' },
        recentTransactions: [],
      } }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: path.endsWith('/tmi/wallet') ? { current: 12, earned: 12, spent: 0, expired: 0 } : { items: [], unreadCount: 0 } }) });
  });
  await page.goto('/wallet/gds');
  await expect(page.locator('.gds-wallet-page__balance-card')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.gds-wallet-page__balance-value')).toHaveText('—');
  await page.screenshot({ path: test.info().outputPath(`wallet-loading-${width}.png`), fullPage: true });
  state = 'income-error'; release?.();
  await expect(page.getByText('Chưa tải được thu nhập.')).toBeVisible();
  await expect(page.locator('.gds-wallet-page__balance-value')).toHaveText('75.000 ₫');
  await expect(page.locator('.gds-wallet-income dd')).toHaveText(['—', '—', '—']);
  await page.screenshot({ path: test.info().outputPath(`wallet-income-error-${width}.png`), fullPage: true });
  state = 'empty'; await page.getByRole('button', { name: 'Thử lại thu nhập' }).click();
  await expect(page.locator('.gds-wallet-page__balance-value')).toHaveText('0 ₫');
  await expect(page.getByText('Bạn chưa có giao dịch GDS.')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath(`wallet-empty-${width}.png`), fullPage: true });
  state = 'locked'; await page.reload();
  await expect(page.getByText('Ví đang tạm khóa. Vui lòng liên hệ hỗ trợ.')).toBeVisible();
  await expect(page.locator('.gds-wallet-page__balance-value')).toHaveText('—');
  await expect(page.getByRole('button', { name: 'Nạp tiền', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Rút tiền', exact: true })).toBeDisabled();
  await page.screenshot({ path: test.info().outputPath(`wallet-locked-${width}.png`), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await runtime.assertClean();
});

test('wallet preserves thirty-digit amounts without horizontal overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 950 });
  await page.addInitScript(value => localStorage.setItem('eduai.auth.session.v1', value), session);
  const large = '999999999999999999999999999999';
  const displayed = '999.999.999.999.999.999.999.999.999.999 ₫';
  const runtime = guardRuntime(page);
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    expect(route.request().method()).toBe('GET');
    const data = path.endsWith('/wallet/gds') ? {
      available: true, mode: 'production', state: 'READY_PRODUCTION',
      balance: { settledMinor: large, availableMinor: large, reservedMinor: '0', currency: 'VND' },
      paymentHeldMinor: '0', withdrawalHeldMinor: '0', totalWithdrawnMinor: large, debtMinor: '0', topupEnabled: true, paymentEnabled: true,
      income: { status: 'READY', totalMinor: large, recognizedMinor: large, pendingMinor: '0', reviewPendingMinor: '0' },
      recentTransactions: [{ id: 'large-credit', type: 'TOPUP_CREDIT', amountMinor: large, occurredAt: '2026-11-05T01:00:00Z' }],
    } : path.endsWith('/tmi/wallet') ? { current: 12, earned: 12, spent: 0, expired: 0 } : { items: [], unreadCount: 0 };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
  });
  await page.goto('/wallet/gds');
  await expect(page.locator('.gds-wallet-page__balance-value')).toHaveText(displayed);
  await expect(page.locator('.gds-history-amount strong')).toHaveText('+' + displayed);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('wallet-large-amount-320.png'), fullPage: true });
  await runtime.assertClean();
});
