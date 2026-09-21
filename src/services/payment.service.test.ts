import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getTrustedCheckoutUrl,
  paymentService,
  resolvePaymentProvider,
} from './payment.service';

const orderId = '11111111-1111-4111-8111-111111111111';
const paymentId = '22222222-2222-4222-8222-222222222222';
const qrCodeDataUrl = 'data:image/png;base64,cXItY29kZQ==';
const checkoutUrl = 'https://pay.payos.vn/web/provider-payment-id';
const vnpayCheckoutUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=9001';
const expiresAt = '2099-09-09T05:00:00.000Z';

function response(data: unknown) {
  return new Response(JSON.stringify({ success: true, data, message: 'OK' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function pending(overrides: Record<string, unknown> = {}) {
  return {
    orderId,
    orderNumber: 'EDU-ORDER-1',
    orderStatus: 'PENDING_PAYMENT',
    paymentRequired: true,
    payment: {
      id: paymentId,
      status: 'PENDING',
      amount: { amountMinor: '20000', currency: 'VND' },
      expiresAt,
      checkoutUrl,
      ...overrides,
    },
  };
}

describe('paymentService checkout presentation cache', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('restores a valid QR after a later status response omits it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(pending({ qrCodeDataUrl })))
      .mockResolvedValueOnce(response(pending({ qrCodeDataUrl: undefined })));
    vi.stubGlobal('fetch', fetchMock);

    const created = await paymentService.create(orderId, 'payment-cache-key-1');
    expect(created.payment?.qrCodeDataUrl).toBe(qrCodeDataUrl);

    const reloaded = await paymentService.status(orderId);
    expect(reloaded.payment?.qrCodeDataUrl).toBe(qrCodeDataUrl);
    expect(reloaded.payment?.checkoutUrl).toBe(checkoutUrl);
  });

  it('does not hydrate a QR into another payment attempt', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(pending({ qrCodeDataUrl })))
      .mockResolvedValueOnce(response({
        ...pending(),
        payment: { ...pending().payment, id: '33333333-3333-4333-8333-333333333333', qrCodeDataUrl: undefined },
      }));
    vi.stubGlobal('fetch', fetchMock);

    await paymentService.create(orderId, 'payment-cache-key-2');
    const state = await paymentService.status(orderId);

    expect(state.payment?.qrCodeDataUrl).toBeUndefined();
  });

  it('clears cached QR when the backend reports a terminal payment state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(pending({ qrCodeDataUrl })))
      .mockResolvedValueOnce(response({
        ...pending(),
        orderStatus: 'CONFIRMED',
        payment: { ...pending().payment, status: 'PAID', qrCodeDataUrl: undefined },
      }))
      .mockResolvedValueOnce(response(pending({ qrCodeDataUrl: undefined })));
    vi.stubGlobal('fetch', fetchMock);

    await paymentService.create(orderId, 'payment-cache-key-3');
    const paid = await paymentService.status(orderId);
    expect(paid.payment?.status).toBe('PAID');
    expect(paid.payment?.qrCodeDataUrl).toBeUndefined();

    const laterPending = await paymentService.status(orderId);
    expect(laterPending.payment?.qrCodeDataUrl).toBeUndefined();
  });

  it('rejects an unsafe cached checkout URL instead of restoring it', async () => {
    localStorage.setItem(
      `eduai:payos-checkout:${orderId}`,
      JSON.stringify({
        orderId,
        paymentId,
        expiresAt,
        checkoutUrl: 'https://malicious.example/checkout',
        qrCodeDataUrl,
      }),
    );
    const fetchMock = vi.fn().mockResolvedValueOnce(response(pending({ checkoutUrl: undefined, qrCodeDataUrl: undefined })));
    vi.stubGlobal('fetch', fetchMock);

    const state = await paymentService.status(orderId);
    expect(state.payment?.checkoutUrl).toBeUndefined();
    expect(state.payment?.qrCodeDataUrl).toBeUndefined();
  });

  it('preserves a safe VNPay checkout URL when a later status response omits presentation data', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(pending({
        id: 'vnpay-attempt-id',
        provider: 'vnpay',
        checkoutUrl: vnpayCheckoutUrl,
        qrCodeDataUrl: undefined,
      })))
      .mockResolvedValueOnce(response(pending({
        id: 'vnpay-attempt-id',
        provider: 'vnpay',
        checkoutUrl: undefined,
        qrCodeDataUrl: undefined,
      })));
    vi.stubGlobal('fetch', fetchMock);

    await paymentService.create(orderId, 'payment-cache-key-vnpay');
    const reloaded = await paymentService.status(orderId);

    expect(reloaded.payment?.provider).toBe('vnpay');
    expect(reloaded.payment?.checkoutUrl).toBe(vnpayCheckoutUrl);
  });

  it('does not revive cached presentation after an explicit unknown provider response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(pending({
        id: 'unknown-provider-attempt-id',
        provider: 'vnpay',
        checkoutUrl: vnpayCheckoutUrl,
        qrCodeDataUrl: undefined,
      })))
      .mockResolvedValueOnce(response(pending({
        id: 'unknown-provider-attempt-id',
        provider: 'stripe' as never,
        checkoutUrl: undefined,
        qrCodeDataUrl: undefined,
      })));
    vi.stubGlobal('fetch', fetchMock);

    await paymentService.create(orderId, 'payment-cache-key-unknown-provider');
    const reloaded = await paymentService.status(orderId);

    expect(reloaded.payment?.provider).toBe('stripe');
    expect(reloaded.payment?.checkoutUrl).toBeUndefined();
  });
});

describe('payment checkout provider boundary', () => {
  it('accepts only exact HTTPS PayOS and VNPay checkout hosts', () => {
    expect(getTrustedCheckoutUrl(vnpayCheckoutUrl, 'vnpay')).toBe(vnpayCheckoutUrl);
    expect(getTrustedCheckoutUrl('https://pay.vnpay.vn/vpcpay.html?vnp_TxnRef=9001', 'vnpay'))
      .toBe('https://pay.vnpay.vn/vpcpay.html?vnp_TxnRef=9001');
    expect(getTrustedCheckoutUrl(checkoutUrl, 'payos')).toBe(checkoutUrl);
    expect(getTrustedCheckoutUrl('http://sandbox.vnpayment.vn/paymentv2/vpcpay.html', 'vnpay')).toBeUndefined();
    expect(getTrustedCheckoutUrl('https://sandbox.vnpayment.vn.evil.example/checkout', 'vnpay')).toBeUndefined();
    expect(getTrustedCheckoutUrl('https://user:password@sandbox.vnpayment.vn/checkout', 'vnpay')).toBeUndefined();
    expect(getTrustedCheckoutUrl('javascript:window.alert(1)', 'vnpay')).toBeUndefined();
    expect(getTrustedCheckoutUrl(vnpayCheckoutUrl, 'payos')).toBeUndefined();
  });

  it('resolves an explicit provider and fails closed for unknown provider values', () => {
    const base = pending({ checkoutUrl: vnpayCheckoutUrl, qrCodeDataUrl: undefined });
    expect(resolvePaymentProvider({ ...base.payment, provider: 'vnpay' })).toBe('vnpay');
    expect(resolvePaymentProvider({ ...base.payment, provider: 'stripe' as never })).toBeUndefined();
  });

  it('uses a safe host fallback only for legacy responses without provider metadata', () => {
    const legacyVnPay = pending({ checkoutUrl: vnpayCheckoutUrl, qrCodeDataUrl: undefined }).payment;
    const legacyPayOs = pending({ checkoutUrl, qrCodeDataUrl }).payment;

    expect(resolvePaymentProvider(legacyVnPay)).toBe('vnpay');
    expect(resolvePaymentProvider(legacyPayOs)).toBe('payos');
    expect(resolvePaymentProvider({ ...legacyVnPay, checkoutUrl: 'https://unknown.example/checkout' }))
      .toBeUndefined();
  });
});
