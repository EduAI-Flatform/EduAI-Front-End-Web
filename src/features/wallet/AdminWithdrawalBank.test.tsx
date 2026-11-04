import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gdsWithdrawalService, type Withdrawal } from '../../services/gds-withdrawal.service';
import { AdminWithdrawalBank } from './AdminWithdrawalBank';
const item: Withdrawal = { id: 'one', ownerId: 'owner', amountMinor: '50000', currency: 'VND', status: 'PROCESSING', bankCode: 'TPB', accountNumber: '00123456', accountHolder: 'NGUYEN VAN AN', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), processingAdminId: 'admin', bankTransactionRef: null, transferredAt: null };
beforeEach(() => vi.spyOn(gdsWithdrawalService, 'adminBanks').mockResolvedValue({ banks: [{ code: 'TPB', bin: '970423', shortName: 'TPBank', name: 'Ngân hàng Tiên Phong', logoUrl: '', verificationSupported: true }], stale: false, verificationRequired: true, verificationAvailable: true }));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe('admin payout QR', () => {
  it('refreshes expired proof in PROCESSING without a status action and resolves legacy bank names', async () => {
    vi.useFakeTimers();
    const proof = { verificationId: 'proof', bankCode: 'TPB', accountNumber: item.accountNumber, accountHolder: item.accountHolder, verifiedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 1000).toISOString() };
    const verify = vi.spyOn(gdsWithdrawalService, 'adminVerifyAccount').mockResolvedValueOnce(proof).mockResolvedValue({ ...proof, expiresAt: new Date(Date.now() + 900000).toISOString() });
    vi.spyOn(gdsWithdrawalService, 'qr').mockResolvedValue({ withdrawalId: item.id, bankCode: 'TPB', bankBin: '970423', bankName: 'TPBank', accountNumber: item.accountNumber, accountHolder: item.accountHolder, amountMinor: item.amountMinor, currency: 'VND', transferContent: 'GDSABC123', qrCodeDataUrl: 'data:image/png;base64,AA==', verifiedAt: proof.verifiedAt, expiresAt: new Date(Date.now() + 900000).toISOString() });
    await act(async () => { render(<AdminWithdrawalBank item={{ ...item, bankCode: 'TPBank' }} actorId="admin" />); });
    expect(screen.getByText('Ngân hàng Tiên Phong')).toBeVisible();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Xác minh tài khoản nhận' })); });
    expect(screen.getByText(/✓ Đã xác minh người nhận/)).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(1001); });
    expect(screen.queryByText(/✓ Đã xác minh người nhận/)).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Xác minh tài khoản nhận' })); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Lấy QR chuyển khoản' })); });
    expect(verify).toHaveBeenCalledTimes(2); expect(screen.getByRole('img', { name: 'QR chuyển khoản yêu cầu one' })).toBeVisible();
  });
  it('fetches on demand for claimant, shows server memo and clears on request transition', async () => {
    const qr = vi.spyOn(gdsWithdrawalService, 'qr').mockResolvedValue({ withdrawalId: item.id, bankCode: 'TPB', bankBin: '970423', bankName: 'TPBank', accountNumber: item.accountNumber, accountHolder: item.accountHolder, amountMinor: item.amountMinor, currency: 'VND', transferContent: 'GDSABC123', qrCodeDataUrl: 'data:image/png;base64,AA==', verifiedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 900000).toISOString() });
    const { rerender } = render(<AdminWithdrawalBank item={item} actorId="admin" />);
    expect(qr).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Lấy QR chuyển khoản' }));
    expect(await screen.findByRole('img', { name: 'QR chuyển khoản yêu cầu one' })).toBeVisible(); expect(screen.getByText('GDSABC123')).toBeVisible();
    expect(screen.getByText('Quét QR chưa đồng nghĩa đã chuyển tiền.')).toBeVisible();
    rerender(<AdminWithdrawalBank item={{ ...item, status: 'PAID' }} actorId="admin" />); expect(screen.queryByRole('img', { name: /QR chuyển khoản/ })).not.toBeInTheDocument();
  });
  it('does not expose QR for other operators, owners or requests outside processing', () => {
    const { rerender } = render(<AdminWithdrawalBank item={item} actorId="other" />);
    expect(screen.queryByRole('button', { name: 'Lấy QR chuyển khoản' })).not.toBeInTheDocument();
    rerender(<AdminWithdrawalBank item={item} actorId="owner" />); expect(screen.queryByRole('button', { name: 'Lấy QR chuyển khoản' })).not.toBeInTheDocument();
    rerender(<AdminWithdrawalBank item={{ ...item, status: 'APPROVED' }} actorId="admin" />); expect(screen.getByRole('button', { name: 'Xác minh tài khoản nhận' })).toBeVisible(); expect(screen.queryByRole('img', { name: /QR chuyển khoản/ })).not.toBeInTheDocument();
  });
});
