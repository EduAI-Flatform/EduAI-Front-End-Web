import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GdsWalletPage } from './GdsWalletPage';
import { gdsWalletService, type GdsWalletSummary } from '../../services/gds-wallet.service';

const sandboxSummary: GdsWalletSummary = {
  available: true,
  mode: 'sandbox',
  state: 'READY_SANDBOX',
  balance: {
    settledMinor: '100000',
    reservedMinor: '25000',
    availableMinor: '75000',
    currency: 'VND',
  },
  topupEnabled: false,
  paymentEnabled: false,
};

const unavailableSummary: GdsWalletSummary = {
  available: false,
  mode: 'disabled',
  state: 'UNAVAILABLE',
  balance: null,
  topupEnabled: false,
  paymentEnabled: false,
};

function renderPage() {
  return render(<MemoryRouter><GdsWalletPage /></MemoryRouter>);
}

afterEach(() => vi.restoreAllMocks());

describe('PAYW-04D read-only GDS wallet', () => {
  it('renders backend-confirmed sandbox balance and keeps topup and spend disabled', async () => {
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValue(sandboxSummary);
    renderPage();

    expect(await screen.findByText('75.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('Đây là số dư thử nghiệm, chưa dùng để thanh toán thật.')).toBeVisible();
    expect(screen.getByRole('button', { name: /Tạo mã QR PayOS/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Nạp GDS/ })).toBeDisabled();
    expect(screen.getByText(/Chưa có lịch sử giao dịch GDS đã được xác minh/)).toBeVisible();
    expect(screen.getByRole('link', { name: /Xem điểm thưởng TMI/ })).toHaveAttribute('href', '/dashboard/tmi');
    expect(screen.queryByRole('img', { name: /QR/ })).not.toBeInTheDocument();
  });

  it('shows actual read-only journal entries and no sensitive transfer references', async () => {
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValue({
      ...sandboxSummary,
      recentTransactions: [{
        id: 'journal-1', type: 'TOPUP_CREDIT', amountMinor: '100000',
        occurredAt: '2026-11-02T12:00:00.000Z',
      }, {
        id: 'journal-2', type: 'RESERVE', amountMinor: '25000',
        occurredAt: '2026-11-02T12:01:00.000Z',
      }],
    });
    renderPage();
    expect(await screen.findByRole('list', { name: /Giao dịch từ sổ cái GDS/ })).toBeVisible();
    expect(screen.getByText('Nạp GDS đã xác minh')).toBeVisible();
    expect(screen.getByText('Giữ GDS cho đơn hàng')).toBeVisible();
    expect(screen.getByText('+100.000 ₫')).toBeVisible();
    expect(screen.getByText('−25.000 ₫')).toBeVisible();
    expect(screen.getByRole('button', { name: /Tạo mã QR PayOS/ })).toBeDisabled();
  });

  it('shows a truthful empty journal when the sandbox backend returns no entries', async () => {
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValue({ ...sandboxSummary, recentTransactions: [] });
    renderPage();
    expect(await screen.findByText('Chưa có giao dịch trong sổ cái GDS thử nghiệm.')).toBeVisible();
    expect(screen.queryByRole('list', { name: /Giao dịch từ sổ cái GDS/ })).not.toBeInTheDocument();
  });

  it('does not fabricate a zero balance or payment QR while disabled', async () => {
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValue(unavailableSummary);
    renderPage();
    expect(await screen.findByText('Ví GDS chưa được bật trong môi trường này.')).toBeVisible();
    expect(screen.queryByText('0 ₫')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tạo mã QR PayOS/ })).toBeDisabled();
  });

  it('shows a network failure separately from balance and can retry a read-only fetch', async () => {
    const summary = vi.spyOn(gdsWalletService, 'summary')
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(sandboxSummary);
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Không thể kết nối/);
    expect(screen.queryByText('0 ₫')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Làm mới số dư/ }));
    expect(await screen.findByText('75.000 ₫')).toBeVisible();
    await waitFor(() => expect(summary).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('updates the one-to-one topup preview locally without issuing a payment', async () => {
    const summary = vi.spyOn(gdsWalletService, 'summary').mockResolvedValue(unavailableSummary);
    renderPage();
    await screen.findByText('Ví GDS chưa được bật trong môi trường này.');
    const amount = screen.getByLabelText('Nhập số tiền chính xác muốn nạp (VND)');
    fireEvent.change(amount, { target: { value: '250000' } });
    expect(screen.getByText(/GDS nhận dự kiến: 250.000 ₫ · Phí nạp: 0 ₫/)).toBeVisible();
    fireEvent.change(amount, { target: { value: '0' } });
    expect(screen.getByText(/GDS nhận dự kiến: — · Phí nạp: 0 ₫/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Tạo mã QR PayOS/ })).toBeDisabled();
    expect(summary).toHaveBeenCalledTimes(1);
  });

  it('keeps a suspended wallet unavailable even if stale balance data is present', async () => {
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValue({
      ...sandboxSummary, available: false, state: 'SUSPENDED',
    });
    renderPage();
    expect(await screen.findByText('Ví đang tạm khóa. Bạn chưa thể thực hiện giao dịch.')).toBeVisible();
    expect(screen.queryByText('75.000 ₫')).not.toBeInTheDocument();
  });
});
