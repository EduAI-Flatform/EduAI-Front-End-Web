import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GdsWithdrawalPanel } from './GdsWithdrawalPanel';
import { gdsWithdrawalService, type Withdrawal } from '../../services/gds-withdrawal.service';
import type { GdsWalletSummary } from '../../services/gds-wallet.service';
import { ApiClientError } from '../../services/api-client';
const wallet: GdsWalletSummary = { available: true, mode: 'sandbox', state: 'READY_SANDBOX', balance: { settledMinor: '100000', reservedMinor: '0', availableMinor: '100000', currency: 'VND' }, withdrawalEnabled: true, debtMinor: '0', paymentEnabled: true, topupEnabled: true };
const catalogue = { banks: [{ code: 'TPB', bin: '970423', shortName: 'TPBank', name: 'Ngân hàng Tiên Phong', logoUrl: '', verificationSupported: true }], stale: false, verificationRequired: true, verificationAvailable: true };
beforeEach(() => {
  vi.spyOn(gdsWithdrawalService, 'settings').mockResolvedValue({ minimumMinor: '10000', maximumMinor: '10000000', version: 2, admissionEnabled: true, processingEnabled: true, accountVerificationRequired: true, accountVerificationAvailable: true });
  vi.spyOn(gdsWithdrawalService, 'list').mockResolvedValue({ items: [], total: 0, totalPages: 0, page: 1, pageSize: 20 });
  vi.spyOn(gdsWithdrawalService, 'banks').mockResolvedValue(catalogue);
});
afterEach(() => vi.restoreAllMocks());
async function open() {
  render(<GdsWithdrawalPanel summary={wallet} onChanged={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole('button', { name: /^Rút tiền$/ })).toBeEnabled()); fireEvent.click(screen.getByRole('button', { name: /^Rút tiền$/ }));
  await waitFor(() => expect(screen.getByRole('combobox')).toBeEnabled());
  fireEvent.focus(screen.getByRole('combobox')); fireEvent.click(await screen.findByRole('option', { name: /TPBank/ }));
  fireEvent.change(screen.getByLabelText('Số tiền rút (VND)'), { target: { value: '10000' } });
  fireEvent.change(screen.getByLabelText('Số tài khoản'), { target: { value: '00123456' } });
}
describe('mandatory verified withdrawal form', () => {
  it('allows fresh verification after a definite expired-proof rejection', async () => {
    const proof = { verificationId: 'proof-old', bankCode: 'TPB', accountNumber: '00123456', accountHolder: 'NGUYEN VAN AN', verifiedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 900000).toISOString() };
    vi.spyOn(gdsWithdrawalService, 'verifyAccount').mockResolvedValueOnce(proof).mockResolvedValue({ ...proof, verificationId: 'proof-new' });
    const create = vi.spyOn(gdsWithdrawalService, 'create').mockRejectedValue(new ApiClientError('Expired proof', 'VERIFICATION_EXPIRED', 409));
    await open(); await waitFor(() => expect(screen.getByRole('button', { name: 'Kiểm tra yêu cầu' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra yêu cầu' })); fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gửi yêu cầu' }));
    await screen.findByRole('alert'); await waitFor(() => expect(screen.getByRole('button', { name: 'Kiểm tra yêu cầu' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra yêu cầu' })); fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gửi yêu cầu' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[0][0].verificationId).toBe('proof-old'); expect(create.mock.calls[1][0].verificationId).toBe('proof-new');
    expect(create.mock.calls[0][1]).not.toBe(create.mock.calls[1][1]);
  });
  it('only permits review with a current proof and submits its verified name and ID', async () => {
    vi.spyOn(gdsWithdrawalService, 'verifyAccount').mockResolvedValue({ verificationId: 'proof-1', bankCode: 'TPB', accountNumber: '00123456', accountHolder: 'NGUYEN VAN AN', verifiedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 900000).toISOString() });
    const create = vi.spyOn(gdsWithdrawalService, 'create').mockResolvedValue({ id: 'created', status: 'PENDING', amountMinor: '10000', bankCode: 'TPB', accountNumber: '00123456', accountHolder: 'NGUYEN VAN AN', createdAt: new Date().toISOString() } as Withdrawal);
    await open();
    expect(screen.getByRole('button', { name: 'Kiểm tra yêu cầu' })).toBeDisabled(); expect(screen.getByLabelText('Tên chủ tài khoản')).toHaveAttribute('readonly');
    await waitFor(() => expect(screen.getByLabelText('Tên chủ tài khoản')).toHaveValue('NGUYEN VAN AN'));
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra yêu cầu' })); fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gửi yêu cầu' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ amountMinor: '10000', bankCode: 'TPB', accountNumber: '00123456', accountHolder: 'NGUYEN VAN AN', verificationId: 'proof-1' }, expect.any(String)));
  });
  it('clears the name immediately on destination change and never holds funds on lookup error', async () => {
    vi.spyOn(gdsWithdrawalService, 'verifyAccount').mockResolvedValueOnce({ verificationId: 'proof-1', bankCode: 'TPB', accountNumber: '00123456', accountHolder: 'NGUYEN VAN AN', verifiedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 900000).toISOString() }).mockRejectedValue(new Error('provider unavailable'));
    const create = vi.spyOn(gdsWithdrawalService, 'create');
    await open(); await waitFor(() => expect(screen.getByLabelText('Tên chủ tài khoản')).toHaveValue('NGUYEN VAN AN'));
    fireEvent.change(screen.getByLabelText('Số tài khoản'), { target: { value: '00999999' } });
    expect(screen.getByLabelText('Tên chủ tài khoản')).toHaveValue(''); expect(screen.getByRole('button', { name: 'Kiểm tra yêu cầu' })).toBeDisabled();
    expect(await screen.findByRole('button', { name: 'Thử xác minh lại' })).toBeEnabled(); expect(create).not.toHaveBeenCalled();
  });
  it('shows catalogue error and retries without allowing arbitrary bank codes', async () => {
    vi.mocked(gdsWithdrawalService.banks).mockRejectedValueOnce(new Error('catalogue unavailable'));
    render(<GdsWithdrawalPanel summary={wallet} onChanged={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /^Rút tiền$/ })).toBeEnabled()); fireEvent.click(screen.getByRole('button', { name: /^Rút tiền$/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Thử tải ngân hàng lại' }));
    await waitFor(() => expect(screen.getByRole('combobox')).toBeEnabled()); fireEvent.change(screen.getByRole('combobox'), { target: { value: 'unknown' } });
    expect(screen.getByText(/Không tìm thấy ngân hàng phù hợp/)).toBeVisible(); expect(screen.getByRole('button', { name: 'Kiểm tra yêu cầu' })).toBeDisabled();
  });
});
