import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GdsWalletPage } from './GdsWalletPage';
import { gdsWalletService, type GdsWalletSummary } from '../../services/gds-wallet.service';
import { tmiService } from '../../services/tmi.service';

const wallet: GdsWalletSummary = {
  available: true, mode: 'sandbox', state: 'READY_SANDBOX',
  balance: { settledMinor: '100000', reservedMinor: '25000', availableMinor: '75000', currency: 'VND' },
  topupEnabled: true, paymentEnabled: false, recentTransactions: [],
};

function renderPage() {
  return render(<MemoryRouter><GdsWalletPage /></MemoryRouter>);
}

beforeEach(() => {
  vi.spyOn(gdsWalletService, 'summary').mockResolvedValue(wallet);
  vi.spyOn(tmiService, 'wallet').mockResolvedValue({ current: 1234, earned: 2000, spent: 766, expired: 0 });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('PAYW-04D wallet QR presentation', () => {
  it('removes the sandbox badge, refresh button and footer, and displays actual TMI points', async () => {
    renderPage();
    expect(await screen.findByText('75.000 ₫')).toBeVisible();
    expect(await screen.findByText('1.234 điểm')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Đổi điểm thưởng TMI' })).toHaveAttribute('href', '/dashboard/tmi');
    expect(screen.getByRole('heading', { name: 'Ví GDS' }).closest('.gds-wallet-page__balance-card')).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Nạp tiền vào ví' })).not.toBeInTheDocument();
    expect(screen.queryByText('Chưa khởi tạo', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText(/SANDBOX · CHƯA GIAO DỊCH THẬT/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Làm mới số dư/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/không hỗ trợ rút tiền tùy ý/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo mã QR PayOS' })).toBeEnabled();
  });

  it('explains an empty wallet and still allows requesting a QR without a redundant topup link', async () => {
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValue({
      available: false, mode: 'sandbox', state: 'NOT_INITIALIZED',
      balance: null, topupEnabled: true, paymentEnabled: false, recentTransactions: [],
    });
    renderPage();
    expect(await screen.findByText(/Bạn chưa có số dư GDS đã xác minh/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tạo mã QR PayOS' })).toBeEnabled();
    expect(screen.queryByRole('link', { name: 'Nạp tiền vào ví' })).not.toBeInTheDocument();
    expect(screen.queryByText('0 ₫', { exact: true })).not.toBeInTheDocument();
  });

  it('renders an exact provider QR response and explains credit requires PayOS reconciliation', async () => {
    const create = vi.spyOn(gdsWalletService, 'createPayosQr').mockResolvedValue({
      topupId: 'topup-1', amountMinor: '250000', currency: 'VND', transferMemo: 'G0AB12CD3',
      receivingAccount: '123456789', checkoutUrl: 'https://pay.payos.vn/web/payment_123',
      qrCodeDataUrl: 'data:image/png;base64,AAAA', expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      status: 'AWAITING_TRANSFER', gdsCredited: false,
    });
    renderPage();
    const field = screen.getByLabelText('Nhập số tiền chính xác muốn nạp (VND)');
    fireEvent.change(field, { target: { value: '250000' } });
    expect(screen.getByText(/Số tiền trên QR: 250.000 ₫/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã QR PayOS' }));
    expect(await screen.findByRole('img', { name: /Mã QR PayOS cho yêu cầu nạp/ })).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    expect(screen.getByText('G0AB12CD3')).toBeVisible();
    expect(screen.getByText('123456789')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Xem thông tin trên PayOS' })).toHaveAttribute('href', 'https://pay.payos.vn/web/payment_123');
    expect(screen.getByText(/hệ thống sẽ đối soát với PayOS/)).toBeVisible();
    expect(screen.getByText(/Tạo mã QR không đồng nghĩa đã nạp tiền/)).toBeVisible();
    expect(create).toHaveBeenCalledWith('250000', expect.any(String));
    fireEvent.change(field, { target: { value: '300000' } });
    expect(screen.queryByRole('img', { name: /Mã QR PayOS cho yêu cầu nạp/ })).not.toBeInTheDocument();
  });

  it('refreshes an existing wallet silently while awaiting PayOS reconciliation', async () => {
    let onPollingTick: (() => void) | null = null;
    vi.spyOn(globalThis, 'setInterval').mockImplementation((handler) => {
      if (typeof handler === 'function') onPollingTick = handler as () => void;
      return 123 as unknown as ReturnType<typeof setInterval>;
    });
    vi.spyOn(gdsWalletService, 'createPayosQr').mockResolvedValue({
      topupId: 'topup-uat', amountMinor: '100000', currency: 'VND', transferMemo: 'G0AB12CD3',
      receivingAccount: '123456789', checkoutUrl: 'https://pay.payos.vn/web/uat',
      qrCodeDataUrl: 'data:image/png;base64,AAAA',
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      status: 'AWAITING_TRANSFER', gdsCredited: false,
    });
    renderPage();
    expect(await screen.findByText('75.000 ₫')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã QR PayOS' }));
    expect(await screen.findByRole('img', { name: /Mã QR PayOS cho yêu cầu nạp/ })).toBeVisible();
    const getSummary = vi.mocked(gdsWalletService.summary);
    const initialCalls = getSummary.mock.calls.length;
    expect(onPollingTick).not.toBeNull();
    await act(async () => { (onPollingTick as (() => void) | null)?.(); await Promise.resolve(); });
    expect(getSummary.mock.calls.length).toBeGreaterThan(initialCalls);
    expect(screen.getByText('75.000 ₫')).toBeVisible();
    expect(screen.queryByText('Đang tải…')).not.toBeInTheDocument();
  });

  it('shows friendly QR feedback without a red wallet error and without a fake balance', async () => {
    vi.spyOn(gdsWalletService, 'summary').mockRejectedValue(new Error('offline'));
    vi.spyOn(gdsWalletService, 'createPayosQr').mockRejectedValue(new Error('offline'));
    renderPage();
    expect(await screen.findByText(/Không thể kết nối để kiểm tra Ví GDS/)).toBeVisible();
    expect(screen.queryByText('0 ₫', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo mã QR PayOS' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã QR PayOS' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Chưa tạo được mã QR PayOS/);
  });

  it('rejects invalid input without calling the provider or displaying a QR', async () => {
    const create = vi.spyOn(gdsWalletService, 'createPayosQr');
    renderPage();
    const field = screen.getByLabelText('Nhập số tiền chính xác muốn nạp (VND)');
    fireEvent.change(field, { target: { value: '1000' } });
    expect(screen.getByRole('button', { name: 'Tạo mã QR PayOS' })).toBeDisabled();
    fireEvent.change(field, { target: { value: '10000001' } });
    expect(screen.getByRole('button', { name: 'Tạo mã QR PayOS' })).toBeDisabled();
    expect(create).not.toHaveBeenCalled();
  });

  it('never renders a mismatched QR or falsely credits the balance', async () => {
    vi.spyOn(gdsWalletService, 'createPayosQr').mockResolvedValue({
      topupId: 'topup-1', amountMinor: '100001', currency: 'VND', transferMemo: 'G0AB12CD3',
      receivingAccount: '123456789', checkoutUrl: 'https://pay.payos.vn/web/abc',
      qrCodeDataUrl: 'data:image/png;base64,AAAA', expiresAt: '2026-11-02T12:15:00.000Z',
      status: 'AWAITING_TRANSFER', gdsCredited: false,
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã QR PayOS' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible());
    expect(screen.queryByRole('img', { name: /Mã QR PayOS cho yêu cầu nạp/ })).not.toBeInTheDocument();
  });

  it('displays journal entries accurately when available', async () => {
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValue({ ...wallet, recentTransactions: [
      { id: 'a', type: 'TOPUP_CREDIT', amountMinor: '100000', occurredAt: '2026-11-02T12:00:00.000Z' },
      { id: 'b', type: 'RESERVE', amountMinor: '25000', occurredAt: '2026-11-02T12:01:00.000Z' },
    ] });
    renderPage();
    expect(await screen.findByText('+100.000 ₫')).toBeVisible();
    expect(screen.getByText('−25.000 ₫')).toBeVisible();
  });

  it('does not fabricate TMI points when its service is unavailable', async () => {
    vi.spyOn(tmiService, 'wallet').mockRejectedValue(new Error('offline'));
    renderPage();
    await waitFor(() => expect(screen.getByText('—')).toBeVisible());
    expect(screen.queryByText('0 điểm')).not.toBeInTheDocument();
  });
});
