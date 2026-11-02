import { describe, expect, it } from 'vitest';
import { ApiClientError } from './api-client';
import { formatGdsVnd, getGdsCheckoutError, getGdsWalletError } from './gds-wallet.service';

describe('GDS wallet read-only presentation helpers', () => {
  it('formats exact VND balances without unsafe floating-point conversion', () => {
    expect(formatGdsVnd('100000')).toBe('100.000 ₫');
    expect(formatGdsVnd('9007199254740993')).toBe('9.007.199.254.740.993 ₫');
    expect(formatGdsVnd('0')).toBe('0 ₫');
  });

  it.each([null, undefined, '', '-1', '12.5', '0001', '1e7', ' 123 ', '9'.repeat(31)])(
    'does not display malformed or unverified balance %s',
    (value) => expect(formatGdsVnd(value)).toBe('—'),
  );

  it('does not misrepresent an unavailable system as a zero wallet', () => {
    expect(getGdsWalletError(new ApiClientError('missing', 'NOT_FOUND', 404))).toMatch(/chưa cung cấp số dư Ví GDS/);
    expect(getGdsWalletError(new ApiClientError('forbidden', 'FORBIDDEN', 403))).toMatch(/không có quyền/);
    expect(getGdsWalletError(new Error('network'))).toMatch(/Không thể kết nối/);
  });

  it('communicates insufficient GDS and closed release gate in learner language', () => {
    expect(getGdsCheckoutError(new ApiClientError('insufficient', 'GDS_CAPTURE_INSUFFICIENT_FUNDS', 409)))
      .toMatch(/không đủ số dư/);
    expect(getGdsCheckoutError(new ApiClientError('blocked', 'FORBIDDEN', 403)))
      .toMatch(/chưa được mở/);
    expect(getGdsCheckoutError(new Error('unknown'))).toMatch(/kiểm tra lại trạng thái đơn/);
  });
});
