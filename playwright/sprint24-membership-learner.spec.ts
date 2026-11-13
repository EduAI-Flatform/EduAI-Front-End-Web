import { expect } from '@playwright/test';
import { test } from './platform-shell.fixture';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';
import { assertNoStitchData, guardRuntime } from './runtime-guards';

const session = JSON.stringify({
  accessToken: '',
  refreshToken: '',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: {
    id: 'membership-student',
    email: 'student@example.com',
    fullName: 'Học viên hội viên',
    status: 'active',
    roles: ['student'],
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T00:00:00.000Z',
  },
});

for (const viewport of [{ name: '320', width: 320, height: 800 }, { name: '1440', width: 1440, height: 1000 }]) {
  test(`historical membership order retains explicit QR controls at ${viewport.name}px`, async ({ page }) => {
    await page.addInitScript((value) => window.localStorage.setItem('eduai.auth.session.v1', value), session);
    await installFixtures(page);
    const runtime = guardRuntime(page);
    let paymentCreateRequests = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/payments/orders/order-id/request')) {
        paymentCreateRequests += 1;
      }
    });
    await page.setViewportSize(viewport);
    // Existing membership orders remain readable independently of retired new
    // package sales; opening an order must not create a payment automatically.
    await page.goto('/orders/order-id');
    await expect(page).toHaveURL(/\/orders\/order-id$/);
    await expect(page.getByRole('heading', { name: 'EDU-M-RESPONSIVE' })).toBeVisible();
    expect(paymentCreateRequests).toBe(0);
    await page.getByRole('radio', { name: /Quét mã QR/ }).check();
    await page.getByRole('button', { name: /100\.000/ }).click();

    const qr = page.getByRole('img', { name: /EDU-M-RESPONSIVE/ });
    await expect(qr).toBeVisible();
    await expect(qr).toHaveAttribute('src', /^data:image\/png;base64,/);
    await expect(page.getByText(/Quét QR bằng ứng dụng ngân hàng/)).toBeVisible();
    await expect(page.getByText(/100\.000/).last()).toBeVisible();
    await expect(page.locator('.payment-checkout-status')).toHaveText('Chờ thanh toán');
    await expect(page.getByText('Thanh toán đã xác nhận', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Thanh toán$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hủy yêu cầu thanh toán' })).toBeVisible();
    expect(paymentCreateRequests).toBe(1);

    const dimensions = await page.locator('body').evaluate((body) => ({ clientWidth: body.clientWidth, scrollWidth: body.scrollWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    await assertNoStitchData(page);
    runtime.assertClean();
  });
}

for (const width of [320, 1440]) {
  test(`retired membership sales redirect to configurable cards at ${width}px`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('eduai.auth.session.v1', value), session);
    await installFixtures(page);
    await page.route('**/api/v1/membership-cards/me', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: {
      policy: DEFAULT_PLATFORM_SETTINGS.membership,
      evaluation: { status: 'disabled', tier: null, qualifyingAmountMinor: null, policyRevisionId: null },
      legacyPurchasedAccessPreserved: true, entitlementMigrationApplied: false,
    } }) }));
    await page.route('**/api/v1/membership/service-entitlements', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ success: true,
        data: { items: [], cardItems: [], evaluatedAt: '2026-11-13T00:00:00Z' } }),
    }));
    const retiredRequests: string[] = [];
    page.on('request', request => {
      if (/\/membership\/(?:catalog|checkout)(?:\?|$)|\/payments\/.*\/request/.test(request.url())) retiredRequests.push(new URL(request.url()).pathname);
    });
    const runtime = guardRuntime(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/membership');
    await expect(page).toHaveURL(/\/membership-cards$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Thẻ thành viên' })).toBeVisible();
    await expect(page.getByText('Quyền học đã mua được giữ nguyên.')).toBeVisible();
    await expect(page.getByText('Ngưỡng xét hạng chưa được áp dụng')).toHaveCount(3);
    await expect(page.getByText('Hiện chưa có quota thẻ khả dụng.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Gia hạn gói|Mua gói|Nâng cấp gói/ })).toHaveCount(0);
    expect(retiredRequests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    runtime.assertClean();
  });
}

async function installFixtures(page: import('@playwright/test').Page) {
  let paymentCreated = false;
  const json = (data: unknown, status = 200) => ({ contentType: 'application/json', status, body: JSON.stringify({ success: true, message: 'OK', data }) });
  await page.route('**/api/v1/payments/methods', (route) => route.fulfill(json({ methods: ['payos'] })));
  await page.route('**/api/v1/notifications/unread-count', (route) => route.fulfill(json({ unreadCount: 0 })));
  await page.route('https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.PayOSCheckout = { usePayOS(config) { return { open() { const target = document.getElementById(config.ELEMENT_ID); const iframe = document.createElement('iframe'); iframe.title = 'payOS Embedded Checkout'; iframe.src = 'about:blank'; target?.appendChild(iframe); }, exit() { document.getElementById(config.ELEMENT_ID)?.replaceChildren(); } }; } };`,
    status: 200,
  }));
  await page.route('**/api/v1/membership/catalog', (route) => route.fulfill(json({ items: [
    { id: 'gold-version', plan: { id: 'gold-plan', code: 'GOLD' }, displayName: 'EduAI Gold', description: 'Học chuyên sâu với quyền lợi nâng cao.', currency: 'VND', durations: [{ id: 'gold-annual', months: 12, basePriceAmountMinor: '2400000', discountPercent: 25, finalPriceAmountMinor: '1800000' }], services: [{ code: 'AI_COACH', displayName: 'AI Coach', valueType: 'METERED', booleanValue: null, quota: '30', unitLabel: 'lượt' }], includedCourses: [{ id: 'course-id', title: 'AI an toàn', slug: 'ai-an-toan', graceDays: 7 }], removedCourses: [{ id: 'removed-course', title: 'Dữ liệu ứng dụng', slug: 'du-lieu-ung-dung', startedBeforeRemoval: true, graceDays: 14, graceStartsAt: '2027-08-01T00:00:00.000Z', graceEndsAt: '2027-08-15T00:00:00.000Z' }] },
    { id: 'basic-version', plan: { id: 'basic-plan', code: 'BASIC' }, displayName: 'EduAI Basic', description: null, currency: 'VND', durations: [{ id: 'basic-monthly', months: 1, basePriceAmountMinor: '100000', discountPercent: 0, finalPriceAmountMinor: '100000' }], services: [], includedCourses: [], removedCourses: [] },
  ] })));
  await page.route('**/api/v1/membership/current', (route) => route.fulfill(json({ membership: { id: 'subscription-id', plan: { id: 'gold-plan', code: 'GOLD' }, versionId: 'gold-version', displayName: 'EduAI Gold', startsAt: '2026-08-01T00:00:00.000Z', expiresAt: '2027-08-01T00:00:00.000Z', status: 'ACTIVE' }, pendingChange: null, expiringGraceCourses: [{ courseId: 'grace-course', title: 'Học máy nâng cao', slug: 'hoc-may-nang-cao', graceEndsAt: '2027-08-05T00:00:00.000Z' }] })));
  await page.route('**/api/v1/commerce/orders/order-id', (route) => route.fulfill(json({
    id: 'order-id', orderNumber: 'EDU-M-RESPONSIVE', status: 'PENDING_PAYMENT', fulfillmentStatus: 'NOT_STARTED',
    subtotal: { amountMinor: '100000', currency: 'VND' }, discount: { amountMinor: '0', currency: 'VND' },
    payable: { amountMinor: '100000', currency: 'VND' }, paymentRequired: true,
    lines: [{ id: 'membership-line', productType: 'MEMBERSHIP', productReferenceId: 'basic-plan', title: 'EduAI Basic', quantity: 1,
      unitListPrice: { amountMinor: '100000', currency: 'VND' }, finalPrice: { amountMinor: '100000', currency: 'VND' } }],
    payment: paymentCreated ? { id: 'attempt-id', status: 'PENDING', amount: { amountMinor: '100000', currency: 'VND' },
      expiresAt: '2028-08-25T01:15:00.000Z', createdAt: '2026-11-03T00:00:00.000Z' } : null,
    createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z',
    confirmedAt: null, cancelledAt: null, expiredAt: null,
  })));
  await page.route('**/api/v1/membership/checkout', async (route) => {
    const request = route.request();
    expect(request.method()).toBe('POST');
    expect(request.headers()['idempotency-key']).toBeTruthy();
    expect(request.postDataJSON()).toMatchObject({ versionId: 'basic-version', durationOptionId: 'basic-monthly', requestedChange: 'DOWNGRADE', changedBenefitsConfirmed: true });
    await route.fulfill(json({ order: { id: 'order-id', orderNumber: 'EDU-M-RESPONSIVE', status: 'PENDING_PAYMENT', payable: { amountMinor: '100000', currency: 'VND' } }, action: 'DOWNGRADE', plan: { id: 'basic-plan', code: 'BASIC', versionId: 'basic-version', displayName: 'EduAI Basic' }, durationMonths: 1, startsAt: '2027-08-01T00:00:00.000Z', endsAt: '2027-09-01T00:00:00.000Z', activatesImmediately: false, removedCourses: [], paymentRequired: true }, 201));
  });
  await page.route('**/api/v1/payments/orders/order-id/request', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      paymentCreated = true;
      expect(request.headers()['idempotency-key']).toBeTruthy();
    } else {
      expect(request.method()).toBe('GET');
    }
    await route.fulfill(json({
      orderId: 'order-id',
      orderNumber: 'EDU-M-RESPONSIVE',
      orderStatus: 'PENDING_PAYMENT',
      paymentRequired: true,
      payment: {
        id: 'attempt-id',
        provider: 'payos',
        status: 'PENDING',
        amount: { amountMinor: '100000', currency: 'VND' },
        expiresAt: '2028-08-25T01:15:00.000Z',
        checkoutUrl: 'https://pay.payos.vn/web/order-id',
        qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=',
      },
    }, 201));
  });
}


test.beforeEach(async ({page}) => {
  await page.route('**/api/v1/wallet/gds',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{available:false,mode:'disabled',state:'UNAVAILABLE',balance:null,paymentEnabled:false,topupEnabled:false}})}));
});
