import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { ApiClient } from './api-client';
import { canSubmitWithdrawal, gdsWithdrawalService, withdrawalActions } from './gds-withdrawal.service';

const settings = { minimumMinor: '50000', maximumMinor: '10000000', version: 1, admissionEnabled: true, processingEnabled: true };
describe('withdrawal presentation policy', () => {
  it('omits read-only provider availability from settings writes', async () => {
    const patch = vi.spyOn(ApiClient.prototype, 'patch').mockResolvedValue(settings);
    try {
      await gdsWithdrawalService.updateSettings({ ...settings, accountVerificationRequired: true, accountVerificationAvailable: false });
      expect(patch).toHaveBeenCalledWith('/admin/wallet/gds/withdrawal-settings', { ...settings, accountVerificationRequired: true });
    } finally { patch.mockRestore(); }
  });
  it('uses inclusive server limits and exact integer balances', () => {
    expect(canSubmitWithdrawal('50000', '10000000', '0', settings)).toBe(true);
    expect(canSubmitWithdrawal('10000000', '10000000', '0', settings)).toBe(true);
    for (const amount of ['49999', '10000001', '050000', '1e5', '-1', '1.5']) expect(canSubmitWithdrawal(amount, '10000000', '0', settings)).toBe(false);
  });
  it('blocks debt, disabled admission and insufficient funds', () => {
    expect(canSubmitWithdrawal('50000', '49999', '0', settings)).toBe(false);
    expect(canSubmitWithdrawal('50000', '100000', '1', settings)).toBe(false);
    expect(canSubmitWithdrawal('50000', '100000', '0', {...settings, admissionEnabled: false})).toBe(false);
  });
  it('never offers cancellation or rejection of a processing transfer', () => {
    expect(withdrawalActions('PROCESSING')).toEqual(['pay', 'fail']);
    expect(withdrawalActions('PAID')).toEqual([]);
    expect(withdrawalActions('PENDING')).toEqual(['approve', 'reject']);
  });
});
