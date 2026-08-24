import { afterEach, describe, expect, it, vi } from 'vitest';
import { commerceService, formatCommerceMoney } from './commerce.service';

afterEach(() => vi.unstubAllGlobals());

describe('commerceService', () => {
  it('sends only a course identity when adding an item', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { items: [] }, message: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await commerceService.addCourse('course-id');

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ courseId: 'course-id' });
    expect(options.body).not.toContain('amount');
  });

  it('sends a bounded idempotency key and voucher identities without totals', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: 'order-id' }, message: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await commerceService.createOrder([{ courseId: 'course-id', code: 'SAVE20' }], 'request-key-1');

    const [, options] = fetchMock.mock.calls[0];
    expect(new Headers(options.headers).get('Idempotency-Key')).toBe('request-key-1');
    expect(JSON.parse(options.body)).toEqual({
      voucherApplications: [{ courseId: 'course-id', code: 'SAVE20' }],
    });
    expect(options.body).not.toContain('price');
    expect(options.body).not.toContain('total');
  });

  it('formats server-returned VND integer strings', () => {
    expect(formatCommerceMoney({ amountMinor: '250000', currency: 'VND' })).toContain('250.000');
    expect(
      formatCommerceMoney({ amountMinor: '9007199254740993000', currency: 'VND' }),
    ).toContain('9.007.199.254.740.993.000');
  });
});
