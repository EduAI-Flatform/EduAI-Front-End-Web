import { expect, test } from '@playwright/test';
import { assertNoStitchData, guardRuntime } from './runtime-guards';

const session = JSON.stringify({
  accessToken: '',
  refreshToken: '',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: {
    id: 'vnpay-student',
    email: 'student@example.com',
    fullName: 'VNPay student',
    status: 'active',
    roles: ['student'],
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T00:00:00.000Z',
  },
});

const viewports = [
  { name: '320', width: 320, height: 800 },
  { name: '375', width: 375, height: 800 },
  { name: '390', width: 390, height: 844 },
  { name: '412', width: 412, height: 915 },
  { name: '768', width: 768, height: 900 },
  { name: '1024', width: 1024, height: 900 },
  { name: '1440', width: 1440, height: 1000 },
];
const returnOrderId = '11111111-1111-4111-8111-111111111111';
const cancelOrderId = '22222222-2222-4222-8222-222222222222';

for (const viewport of viewports) {
  test(`VNPay hosted course checkout is usable at ${viewport.name}px`, async ({ page }) => {
    await page.addInitScript((value) => window.localStorage.setItem('eduai.auth.session.v1', value), session);
    await installFixtures(page);
    const runtime = guardRuntime(page);
    await page.setViewportSize(viewport);
    await page.goto('/orders/vnpay-order-id');

    await expect(page.getByRole('heading', { level: 1, name: 'EDU-COURSE-VNPAY' })).toBeVisible();
    const action = page.getByRole('button', { name: 'Tiếp tục thanh toán VNPay' });
    await expect(action).toBeVisible();
    await expect(action).toBeEnabled();
    await expect(action).toHaveAttribute('aria-label', 'Tiếp tục thanh toán VNPay');

    const dimensions = await page.locator('body').evaluate((body) => ({
      clientWidth: body.clientWidth,
      scrollWidth: body.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    await assertNoStitchData(page);
    runtime.assertClean();

    await action.click();
    await expect(page).toHaveURL(/https:\/\/sandbox\.vnpayment\.vn\/paymentv2\/vpcpay\.html/);
  });
}

test('VNPay-style return keeps hostile success claims pending until the backend confirms PAID', async ({ page }) => {
  await page.addInitScript((value) => window.localStorage.setItem('eduai.auth.session.v1', value), session);
  const returnFixtures = await installReturnFixtures(page, true, returnOrderId);
  const runtime = guardRuntime(page);

  await page.goto(`/payments/return?orderId=${returnOrderId}&vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_Amount=1&vnp_TxnRef=attacker-value&vnp_TransactionNo=attacker-transaction&vnp_PayDate=19990101000000&vnp_SecureHash=fake`);
  await expect(page.getByRole('heading', { name: 'Đã quay lại từ cổng thanh toán' })).toBeVisible();
  await expect(page.locator('.payment-checkout-status')).toHaveText('Chờ thanh toán');
  returnFixtures.releasePaid();
  await expect(page.getByText('Thanh toán đã xác nhận', { exact: true })).toBeVisible({ timeout: 5_000 });
  expect(returnFixtures.requestedOrderIds).toEqual([returnOrderId, returnOrderId]);
  await assertNoStitchData(page);
  runtime.assertClean();
});

test('cancel route still renders backend PAID despite provider failure claims', async ({ page }) => {
  await page.addInitScript((value) => window.localStorage.setItem('eduai.auth.session.v1', value), session);
  await installReturnFixtures(page, false, cancelOrderId);
  const runtime = guardRuntime(page);

  await page.goto(`/payments/cancel?orderId=${cancelOrderId}&vnp_ResponseCode=99&vnp_TransactionStatus=02&vnp_TxnRef=wrong-order`);
  await expect(page.getByRole('heading', { name: 'Đã quay lại từ bước hủy thanh toán' })).toBeVisible();
  await expect(page.getByText('Thanh toán đã xác nhận', { exact: true })).toBeVisible();
  await expect(page.getByText('Đã hủy thanh toán', { exact: true })).not.toBeVisible();
  await assertNoStitchData(page);
  runtime.assertClean();
});

for (const viewport of viewports) {
  test(`payment return status is usable at ${viewport.name}px`, async ({ page }) => {
    await page.addInitScript((value) => window.localStorage.setItem('eduai.auth.session.v1', value), session);
    await installReturnFixtures(page, false, returnOrderId);
    const runtime = guardRuntime(page);
    await page.setViewportSize(viewport);
    await page.goto(`/payments/return?orderId=${returnOrderId}&vnp_ResponseCode=00&vnp_TransactionStatus=00`);

    await expect(page.getByRole('heading', { level: 1, name: 'Đã quay lại từ cổng thanh toán' })).toBeVisible();
    const dimensions = await page.locator('body').evaluate((body) => ({
      clientWidth: body.clientWidth,
      scrollWidth: body.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    await assertNoStitchData(page);
    runtime.assertClean();
  });
}

async function installReturnFixtures(
  page: import('@playwright/test').Page,
  transitionToPaid: boolean,
  orderId = 'vnpay-return-order',
) {
  const json = (data: unknown, status = 200) => ({
    contentType: 'application/json',
    status,
    body: JSON.stringify({ success: true, message: 'OK', data }),
  });
  const pendingState = {
    orderId,
    orderNumber: 'EDU-RETURN-VNPAY',
    orderStatus: 'PENDING_PAYMENT',
    paymentRequired: true,
    payment: {
      id: 'vnpay-return-attempt',
      provider: 'vnpay',
      status: 'PENDING',
      amount: { amountMinor: '200000', currency: 'VND' },
      expiresAt: '2028-08-26T12:00:00.000Z',
    },
  };
  const paidState = {
    ...pendingState,
    orderStatus: 'CONFIRMED',
    payment: { ...pendingState.payment, status: 'PAID' },
  };
  const requestedOrderIds: string[] = [];
  let allowPaid = false;

  await page.route('**/api/v1/notifications/unread-count', (route) => route.fulfill(json({ unreadCount: 0 })));
  await page.route('**/api/v1/payments/orders/**/request', (route) => {
    const match = new URL(route.request().url()).pathname.match(/\/payments\/orders\/([^/]+)\/request$/);
    if (match) requestedOrderIds.push(match[1]);
    const data = transitionToPaid && !allowPaid ? pendingState : paidState;
    return route.fulfill(json(data));
  });

  return {
    requestedOrderIds,
    releasePaid: () => {
      allowPaid = true;
    },
  };
}

async function installFixtures(page: import('@playwright/test').Page) {
  const json = (data: unknown, status = 200) => ({
    contentType: 'application/json',
    status,
    body: JSON.stringify({ success: true, message: 'OK', data }),
  });
  const paymentState = {
    orderId: 'vnpay-order-id',
    orderNumber: 'EDU-COURSE-VNPAY',
    orderStatus: 'PENDING_PAYMENT',
    paymentRequired: true,
    payment: {
      id: 'vnpay-attempt-id',
      status: 'PENDING',
      amount: { amountMinor: '200000', currency: 'VND' },
      expiresAt: '2028-08-26T12:00:00.000Z',
      provider: 'vnpay',
      checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=vnpay-order-id',
    },
  };
  const order = {
    id: 'vnpay-order-id',
    orderNumber: 'EDU-COURSE-VNPAY',
    status: 'PENDING_PAYMENT',
    fulfillmentStatus: 'NOT_STARTED',
    subtotal: { amountMinor: '200000', currency: 'VND' },
    discount: { amountMinor: '0', currency: 'VND' },
    payable: { amountMinor: '200000', currency: 'VND' },
    paymentRequired: true,
    lines: [{
      id: 'course-line-id',
      productType: 'COURSE',
      productReferenceId: 'course-id',
      title: 'Khóa học VNPay',
      quantity: 1,
      unitListPrice: { amountMinor: '200000', currency: 'VND' },
      finalPrice: { amountMinor: '200000', currency: 'VND' },
    }],
    payment: {
      id: 'vnpay-attempt-id',
      status: 'PENDING',
      amount: { amountMinor: '200000', currency: 'VND' },
      expiresAt: '2028-08-26T12:00:00.000Z',
      createdAt: '2026-09-10T00:00:00.000Z',
    },
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
    confirmedAt: null,
    cancelledAt: null,
    expiredAt: null,
  };

  await page.route('**/api/v1/notifications/unread-count', (route) => route.fulfill(json({ unreadCount: 0 })));
  await page.route('**/api/v1/commerce/orders/vnpay-order-id', (route) => route.fulfill(json(order)));
  await page.route('**/api/v1/payments/orders/vnpay-order-id/request', (route) => {
    expect(route.request().method()).toBe('GET');
    return route.fulfill(json(paymentState));
  });
  await page.route('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html**', (route) => route.fulfill({
    contentType: 'text/html',
    status: 200,
    body: '<!doctype html><title>VNPay test destination</title>',
  }));
}
