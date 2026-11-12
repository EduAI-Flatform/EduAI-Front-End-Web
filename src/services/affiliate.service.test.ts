import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureAffiliateVisit, attachAffiliateVisit } from './affiliate.service';
describe('referral visit capture', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.unstubAllGlobals());
  it('keeps first-touch server-issued visit and attaches it to an order', async () => {
    const token = 'a'.repeat(64);
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { token, expiresAt: new Date(Date.now() + 60000).toISOString() } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { attributed: true } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetcher);
    await captureAffiliateVisit('b'.repeat(30));
    await captureAffiliateVisit('c'.repeat(30));
    await attachAffiliateVisit('order');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ orderId: 'order', visitToken: token });
  });
  it('does not admit arbitrary URL parameters as referral codes', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await captureAffiliateVisit('https://invalid');
    await attachAffiliateVisit('order');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
