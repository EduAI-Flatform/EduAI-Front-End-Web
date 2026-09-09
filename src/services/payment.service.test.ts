import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentService } from './payment.service';

const orderId = '11111111-1111-4111-8111-111111111111';
const paymentId = '22222222-2222-4222-8222-222222222222';
const qrCodeDataUrl = 'data:image/png;base64,cXItY29kZQ==';
const checkoutUrl = 'https://pay.payos.vn/web/provider-payment-id';
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
});
