import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from './api-client';
afterEach(() => vi.unstubAllGlobals());
describe('private receipt image transport', () => {
  it('uses bearer authentication and no-store for private PNG bytes', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(new Blob(['png'], { type: 'image/png' }), { status:200,headers:{'Content-Type':'image/png'} }));
    vi.stubGlobal('fetch',fetcher);
    const client = new ApiClient({baseUrl:'/api/v1',getAccessToken:()=> 'synthetic-token'});
    expect((await client.getBlob('/payments/receipts/claim/image')).type).toBe('image/png');
    const [url,options]=fetcher.mock.calls[0];expect(url).toBe('/api/v1/payments/receipts/claim/image');
    expect(options.cache).toBe('no-store');expect(new Headers(options.headers).get('Authorization')).toBe('Bearer synthetic-token');
  });
  it('rejects unexpected private image types',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('html',{status:200,headers:{'Content-Type':'text/html'}})));
    await expect(new ApiClient().getBlob('/payments/receipts/claim/image')).rejects.toThrow('RECEIPT_IMAGE_UNAVAILABLE');
  });
});