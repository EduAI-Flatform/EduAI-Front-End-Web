import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gdsWithdrawalService, type AccountVerification } from '../../services/gds-withdrawal.service';
import { useAccountVerification } from './useAccountVerification';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const verification = (accountNumber = '00123456'): AccountVerification => ({ verificationId: `proof-${accountNumber}`, bankCode: 'TPB', accountNumber, accountHolder: 'NGUYEN VAN AN', verifiedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 900000).toISOString() });
describe('account verification lifetime', () => {
  it('debounces 600ms, preserves zeros and expires the proof after15minutes', async () => {
    vi.useFakeTimers(); const proof = verification();
    const lookup = vi.spyOn(gdsWithdrawalService, 'verifyAccount').mockResolvedValue(proof);
    const { result } = renderHook(() => useAccountVerification('TPB', '00123456', true));
    await act(async () => { await vi.advanceTimersByTimeAsync(599); }); expect(lookup).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(lookup).toHaveBeenCalledWith({ bankCode: 'TPB', accountNumber: '00123456' }); expect(result.current.result).toEqual(proof);
    await act(async () => { await vi.advanceTimersByTimeAsync(900000); }); expect(result.current.result).toBeNull(); expect(result.current.state).toBe('expired');
  });
  it('immediately invalidates changed input and ignores a response arriving out of order', async () => {
    vi.useFakeTimers(); let resolveOld!: (value: AccountVerification) => void;
    vi.spyOn(gdsWithdrawalService, 'verifyAccount').mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce(verification('00999999'));
    const { result, rerender } = renderHook(({ account }) => useAccountVerification('TPB', account, true), { initialProps: { account: '00123456' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    rerender({ account: '00999999' }); expect(result.current.result).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    await act(async () => { resolveOld(verification()); }); expect(result.current.result?.accountNumber).toBe('00999999');
    rerender({ account: '' }); expect(result.current.result).toBeNull();
  });
  it('does not accept a proof for another destination and allows retry after provider failure', async () => {
    vi.useFakeTimers(); const lookup = vi.spyOn(gdsWithdrawalService, 'verifyAccount').mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce(verification('different'));
    const { result } = renderHook(() => useAccountVerification('TPB', '00123456', true));
    await act(async () => { await vi.advanceTimersByTimeAsync(600); }); expect(result.current.state).toBe('error');
    act(() => result.current.retry()); await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(lookup).toHaveBeenCalledTimes(2); expect(result.current.result).toBeNull(); expect(result.current.state).toBe('error');
  });
});
