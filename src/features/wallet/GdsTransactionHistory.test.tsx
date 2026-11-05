import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GdsTransactionHistory } from './GdsTransactionHistory';
import { GdsWithdrawalPanel } from './GdsWithdrawalPanel';
import { gdsWithdrawalService, type Withdrawal } from '../../services/gds-withdrawal.service';
import type { GdsWalletSummary } from '../../services/gds-wallet.service';
const request: Withdrawal = { id: 'request-1', amountMinor: '10000', status: 'PENDING', bankCode: 'MB', accountNumber: '123456789', accountHolder: 'NGUYEN VAN A', createdAt: '2026-11-05T01:00:00Z', updatedAt: '2026-11-05T01:00:00Z', currency: 'VND', processingAdminId: null, transferredAt: null, bankTransactionRef: null };
const records = { items: [request], total: 21, totalPages: 2, page: 1, pageSize: 20 };
afterEach(() => vi.restoreAllMocks());
describe('unified wallet history presentation', () => {
  it('keeps older page records hidden when the next API page fails, then recovers on page1', async () => {
    vi.spyOn(gdsWithdrawalService, 'settings').mockResolvedValue({ minimumMinor: '10000', maximumMinor: '10000000', version: 1, admissionEnabled: true, processingEnabled: true });
    const list = vi.spyOn(gdsWithdrawalService, 'list').mockImplementation(async page => { if (page === 2) throw new Error('unavailable'); return records; });
    const summary: GdsWalletSummary = { available: true, mode: 'sandbox', state: 'READY_SANDBOX', balance: { settledMinor: '100000', availableMinor: '90000', reservedMinor: '10000', currency: 'VND' }, paymentEnabled: false, topupEnabled: false, withdrawalEnabled: true };
    render(<GdsWithdrawalPanel summary={summary} onChanged={vi.fn()} />);
    await screen.findByText(/MB ·/); fireEvent.click(screen.getByRole('button', { name: 'Lọc: Rút tiền' })); fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await screen.findByRole('alert'); expect(list).toHaveBeenCalledWith(2); expect(screen.queryByText(/MB ·/)).not.toBeInTheDocument(); expect(screen.getByText('Trang 2/2')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Lọc: Tất cả' })); expect(screen.queryByText(/MB ·/)).not.toBeInTheDocument(); await screen.findByText(/MB ·/);
  });
  it('renders loading, empty, errors and retries without another history section', () => {
    const retry = vi.fn(); const { rerender } = render(<GdsTransactionHistory loading onRefresh={retry} />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải lịch sử giao dịch');
    rerender(<GdsTransactionHistory transactions={[]} />); expect(screen.getByText('Bạn chưa có giao dịch GDS.')).toBeVisible();
    rerender(<GdsTransactionHistory error="Không thể tải" onRefresh={retry} />); expect(screen.getByRole('alert')).toHaveTextContent('Không thể tải'); fireEvent.click(screen.getByRole('button', { name: 'Thử tải lịch sử lại' })); expect(retry).toHaveBeenCalledOnce();
    expect(screen.getAllByRole('heading', { name: 'Lịch sử giao dịch' })).toHaveLength(1);
  });
  it('does not label records from an older page as the failed requested page', () => {
    render(<GdsTransactionHistory withdrawals={records} page={2} error="Không thể tải trang 2" onSelect={vi.fn()} onPage={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lọc: Rút tiền' })); expect(screen.queryByText(/MB ·/)).not.toBeInTheDocument(); expect(screen.getByText('Trang 2/2')).toBeVisible(); expect(screen.getByRole('alert')).toHaveTextContent('Không thể tải trang 2');
  });
  it('merges ordinary transactions with one request, filters, and preserves pending cancellation after changing filter', async () => {
    vi.spyOn(gdsWithdrawalService, 'settings').mockResolvedValue({ minimumMinor: '10000', maximumMinor: '10000000', version: 1, admissionEnabled: true, processingEnabled: true });
    vi.spyOn(gdsWithdrawalService, 'list').mockResolvedValue({ ...records, total: 1, totalPages: 1 });
    vi.spyOn(gdsWithdrawalService, 'detail').mockResolvedValue(request);
    const cancel = vi.spyOn(gdsWithdrawalService, 'cancel').mockResolvedValue({ ...request, status: 'CANCELLED' });
    const summary: GdsWalletSummary = { available: true, mode: 'sandbox', state: 'READY_SANDBOX', balance: { settledMinor: '100000', availableMinor: '90000', reservedMinor: '10000', currency: 'VND' }, paymentEnabled: false, topupEnabled: false, withdrawalEnabled: true, recentTransactions: [{ id: 'topup', type: 'TOPUP_CREDIT', amountMinor: '100000', occurredAt: '2026-11-05T02:00:00Z' }, { id: 'hold', type: 'WITHDRAWAL_RESERVE', withdrawalId: request.id, amountMinor: '10000', occurredAt: request.createdAt }] };
    render(<GdsWithdrawalPanel summary={summary} onChanged={vi.fn()} />);
    await screen.findByText('Nạp GDS đã xác minh'); const list = screen.getByRole('list', { name: 'Các giao dịch GDS' }); expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Lọc: Rút tiền' })); expect(screen.queryByText('Nạp GDS đã xác minh')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lọc: Tất cả' })); fireEvent.click(screen.getByRole('button', { name: 'Chi tiết' }));
    fireEvent.change(await screen.findByLabelText('Lý do hủy'), { target: { value: 'Không còn nhu cầu' } }); fireEvent.click(screen.getByRole('button', { name: 'Hủy yêu cầu rút tiền' }));
    await waitFor(() => expect(cancel).toHaveBeenCalledWith(request.id, 'Không còn nhu cầu')); expect(screen.queryByRole('heading', { name: 'Lịch sử rút tiền' })).not.toBeInTheDocument();
  });
});
