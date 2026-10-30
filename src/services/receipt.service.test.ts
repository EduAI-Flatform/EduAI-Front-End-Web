import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from './api-client';
import { receiptError, receiptService } from './receipt.service';

vi.mock('./auth.service', () => ({ getAuthSession: () => null }));
afterEach(() => vi.restoreAllMocks());

describe('receipt error presentation', () => {
  it('explains the production-disabled guard from the real API error envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'BANK_RECEIPT_DISABLED' },
      correlationId: 'synthetic-request-id',
    }), { status: 503, headers: { 'Content-Type': 'application/json' } }));
    let failure: unknown;
    try { await receiptService.queue(); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(ApiClientError);
    expect(receiptError(failure)).toBe('Chức năng kiểm tra ảnh chưa được bật trong môi trường này.');
  });

  it('preserves direct business-code precedence', () => {
    expect(receiptError(new ApiClientError('BANK_RECEIPT_DISABLED', 'RECEIPT_OPERATOR_REQUIRED', 403)))
      .toBe('Tài khoản chưa có quyền kiểm tra chứng từ này.');
  });

  it('recognizes an exact wrapped upload error without a correlation id', () => {
    expect(receiptError(new ApiClientError('RECEIPT_IMAGE_TYPE_INVALID', 'BAD_REQUEST', 400)))
      .toBe('Chỉ nhận ảnh PNG hoặc JPEG.');
  });

  it.each(['private database diagnostic', 'BANK_RECEIPT_DISABLED untrusted text'])('never exposes arbitrary server messages: %s', message => {
    expect(receiptError(new ApiClientError(message, 'SERVICE_UNAVAILABLE', 503)))
      .toBe('Chưa thể hoàn tất. Vui lòng tải lại trạng thái và thử lại.');
  });
});
