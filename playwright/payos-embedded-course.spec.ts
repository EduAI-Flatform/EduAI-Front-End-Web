import { expect, test } from '@playwright/test';
import { assertNoStitchData, guardRuntime } from './runtime-guards';

const session = JSON.stringify({
  accessToken: '',
  refreshToken: '',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: {
    id: 'course-student',
    email: 'student@example.com',
    fullName: 'Course student',
    status: 'active',
    roles: ['student'],
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T00:00:00.000Z',
  },
});

for (const viewport of [{ name: '320', width: 320, height: 800 }, { name: '1440', width: 1440, height: 1000 }]) {
  test(`course checkout stays embedded at ${viewport.name}px`, async ({ page }, testInfo) => {
    await page.addInitScript((value) => window.localStorage.setItem('eduai.auth.session.v1', value), session);
    const paymentRequests = await installFixtures(page);
    const runtime = guardRuntime(page);
    await page.setViewportSize(viewport);
    await page.goto('/cart');

    await expect(page.getByText('AI Safety')).toBeVisible();
    await page.locator('aside').getByRole('button').click();
    await expect(page).toHaveURL(/\/orders\/course-order-id$/);
    await expect(page.getByRole('heading', { level: 1, name: 'EDU-C-EMBEDDED' })).toBeVisible();
    await expect(page.getByText(/250\.000/).last()).toBeVisible();

    await expect(page.locator('iframe[title="payOS Embedded Checkout"]')).toBeVisible();
    await expect(page.getByText(/Quét VietQR bằng ứng dụng ngân hàng/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Thanh toán$/i })).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/orders\/course-order-id$/);
    expect(paymentRequests.created).toBe(1);

    await page.screenshot({ path: testInfo.outputPath(`course-checkout-${viewport.name}.png`) });

    const dimensions = await page.locator('body').evaluate((body) => ({
      clientWidth: body.clientWidth,
      scrollWidth: body.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    await assertNoStitchData(page);
    runtime.assertClean();
  });
}

async function installFixtures(page: import('@playwright/test').Page) {
  const paymentRequests = { created: 0 };
  const json = (data: unknown, status = 200) => ({
    contentType: 'application/json',
    status,
    body: JSON.stringify({ success: true, message: 'OK', data }),
  });
  const paymentState = {
    orderId: 'course-order-id',
    orderNumber: 'EDU-C-EMBEDDED',
    orderStatus: 'PENDING_PAYMENT',
    paymentRequired: true,
    payment: {
      id: 'course-attempt-id',
      status: 'PENDING',
      amount: { amountMinor: '250000', currency: 'VND' },
      expiresAt: '2028-08-25T01:15:00.000Z',
      checkoutUrl: 'https://pay.payos.vn/web/course-order-id',
    },
  };
  const orderDetail = {
    id: 'course-order-id',
    orderNumber: 'EDU-C-EMBEDDED',
    status: 'PENDING_PAYMENT',
    fulfillmentStatus: 'NOT_STARTED',
    subtotal: { amountMinor: '250000', currency: 'VND' },
    discount: { amountMinor: '0', currency: 'VND' },
    payable: { amountMinor: '250000', currency: 'VND' },
    paymentRequired: true,
    lines: [{
      id: 'course-line-id',
      productType: 'COURSE',
      productReferenceId: 'course-id',
      title: 'AI Safety',
      quantity: 1,
      unitListPrice: { amountMinor: '250000', currency: 'VND' },
      finalPrice: { amountMinor: '250000', currency: 'VND' },
    }],
    payment: {
      id: 'course-attempt-id',
      status: 'PENDING',
      amount: { amountMinor: '250000', currency: 'VND' },
      expiresAt: '2028-08-25T01:15:00.000Z',
      createdAt: '2026-08-25T01:00:00.000Z',
    },
    createdAt: '2026-08-25T01:00:00.000Z',
    updatedAt: '2026-08-25T01:00:00.000Z',
    confirmedAt: null,
    cancelledAt: null,
    expiredAt: null,
  };

  await page.route('**/api/v1/notifications/unread-count', (route) => route.fulfill(json({ unreadCount: 0 })));
  await page.route('**/api/v1/payments/orders/pending**', (route) => route.fulfill(json({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })));
  await page.route('https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.PayOSCheckout = { usePayOS(config) { return { open() { const target = document.getElementById(config.ELEMENT_ID); const iframe = document.createElement('iframe'); iframe.title = 'payOS Embedded Checkout'; iframe.src = 'about:blank'; target?.appendChild(iframe); }, exit() { document.getElementById(config.ELEMENT_ID)?.replaceChildren(); } }; } };`,
    status: 200,
  }));
  await page.route('**/api/v1/commerce/cart', (route) => route.fulfill(json({
    id: 'cart-id',
    status: 'ACTIVE',
    currency: 'VND',
    items: [{
      id: 'line-id',
      productId: 'product-id',
      course: { id: 'course-id', title: 'AI Safety', slug: 'ai-safety', thumbnailUrl: null },
      unitPrice: { amountMinor: '250000', currency: 'VND' },
      quantity: 1,
      availability: 'AVAILABLE',
      warnings: [],
    }],
    summary: { amountMinor: '250000', currency: 'VND', itemCount: 1, canCheckout: true },
  })));
  await page.route('**/api/v1/commerce/orders/course-order-id', (route) => {
    expect(route.request().method()).toBe('GET');
    return route.fulfill(json(orderDetail));
  });
  await page.route('**/api/v1/commerce/orders', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    expect(route.request().postDataJSON()).toEqual({ voucherApplications: [] });
    await route.fulfill(json({
      id: 'course-order-id',
      orderNumber: 'EDU-C-EMBEDDED',
      status: 'PENDING_PAYMENT',
      fulfillmentStatus: 'NOT_STARTED',
      subtotal: { amountMinor: '250000', currency: 'VND' },
      discount: { amountMinor: '0', currency: 'VND' },
      payable: { amountMinor: '250000', currency: 'VND' },
      pricingPolicyVersion: 'course-v1-single-promotion',
      lines: [],
    }, 201));
  });
  await page.route('**/api/v1/payments/orders/course-order-id/request', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      paymentRequests.created += 1;
      expect(request.headers()['idempotency-key']).toBeTruthy();
    } else {
      expect(request.method()).toBe('GET');
    }
    await route.fulfill(json(paymentState, request.method() === 'POST' ? 201 : 200));
  });
  return paymentRequests;
}
