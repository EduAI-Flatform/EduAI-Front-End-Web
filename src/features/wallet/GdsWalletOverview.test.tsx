import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GdsWalletPage } from './GdsWalletPage';
import { gdsWalletService, type GdsWalletSummary } from '../../services/gds-wallet.service';
import { tmiService } from '../../services/tmi.service';

const wallet: GdsWalletSummary = {
  available: true, mode: 'production', state: 'READY_PRODUCTION',
  balance: { availableMinor: '75000', reservedMinor: '25000', settledMinor: '100000', currency: 'VND' },
  paymentHeldMinor: '15000', withdrawalHeldMinor: '10000', totalWithdrawnMinor: '300000', debtMinor: '2000',
  income: { status: 'READY', totalMinor: '140000', recognizedMinor: '100000', pendingMinor: '40000', reviewPendingMinor: '5000' },
  topupEnabled: true, paymentEnabled: true, recentTransactions: [],
};
function show(summary = wallet) {
  vi.spyOn(gdsWalletService, 'summary').mockResolvedValue(summary);
  vi.spyOn(tmiService, 'wallet').mockResolvedValue({ current: 40, earned: 40, spent: 0, expired: 0 });
  return render(<MemoryRouter><GdsWalletPage /></MemoryRouter>);
}
afterEach(() => vi.restoreAllMocks());
describe('wallet overview', () => {
  it('keeps topup entry behind its action and shows the three primary actions', async () => {
    show();
    expect(await screen.findByRole('heading', { name: 'Ví của tôi' })).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    const topup = screen.getByRole('button', { name: 'Nạp tiền' });
    expect(topup).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Rút tiền' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lịch sử' })).toBeEnabled();
    fireEvent.click(topup);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Số tiền nạp (VND)'), { target: { value: '10000' } });
    expect(within(dialog).getByRole('button', { name: 'Tạo mã QR' })).toBeEnabled();
  });
  it('separates holds, debt and lifetime income without counting withdrawals as earnings', async () => {
    show();
    expect(await screen.findByText('Đang giữ cho thanh toán')).toBeVisible();
    expect(screen.getByText('15.000 ₫')).toBeVisible();
    expect(screen.getByText('10.000 ₫')).toBeVisible();
    expect(screen.getByText('2.000 ₫')).toBeVisible();
    expect(screen.getByText('140.000 ₫')).toBeVisible();
    expect(screen.getByText('300.000 ₫')).toBeVisible();
    expect(screen.getByText(/5.000 ₫.*chờ kiểm tra/)).toBeVisible();
    expect(screen.queryByText(/PayOS|backend|frontend|Admin duyệt/)).not.toBeInTheDocument();
  });
  it('keeps balance when income is unavailable and never invents zero metrics', async () => {
    show({ ...wallet, paymentHeldMinor: undefined, withdrawalHeldMinor: undefined, totalWithdrawnMinor: undefined,
      income: { status: 'UNAVAILABLE', totalMinor: null, recognizedMinor: null, pendingMinor: null, reviewPendingMinor: null } });
    expect(await screen.findByText('75.000 ₫')).toBeVisible();
    expect(screen.getByText('Chưa tải được thu nhập.')).toBeVisible();
    expect(screen.queryByText('0 ₫')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại thu nhập' })).toBeEnabled();
    vi.mocked(gdsWalletService.summary).mockRejectedValue(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại thu nhập' }));
    await waitFor(() => expect(gdsWalletService.summary).toHaveBeenCalledTimes(2));
    expect(screen.getByText('75.000 ₫')).toBeVisible();
    expect(screen.getByText('Chưa tải được thu nhập.')).toBeVisible();
  });
  it('prevents reopening entry while a QR creation is still in flight', async () => {
    show();
    let reject!: (error: Error) => void;
    vi.spyOn(gdsWalletService, 'createPayosQr').mockReturnValue(new Promise((_, fail) => { reject = fail; }));
    fireEvent.click(await screen.findByRole('button', { name: 'Nạp tiền' }));
    fireEvent.change(screen.getByLabelText('Số tiền nạp (VND)'), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã QR' }));
    fireEvent.click(screen.getByRole('button', { name: 'Về ví' }));
    expect(screen.getByRole('button', { name: 'Nạp tiền' })).toBeDisabled();
    reject(new Error('offline'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nạp tiền' })).toBeEnabled());
  });
  it('distinguishes an empty filter from an empty wallet', async () => {
    show({ ...wallet, recentTransactions: [{ id: 'credit', type: 'TOPUP_CREDIT', amountMinor: '10000', occurredAt: '2026-11-05T01:00:00Z' }] });
    await screen.findByText('+10.000 ₫');
    fireEvent.click(screen.getByRole('button', { name: 'Lọc: Tiền ra' }));
    expect(screen.getByText('Chưa có giao dịch phù hợp.')).toBeVisible();
    expect(screen.queryByText('Bạn chưa có giao dịch GDS.')).not.toBeInTheDocument();
  });
});
