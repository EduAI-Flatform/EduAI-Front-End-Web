import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GdsWalletPage } from './GdsWalletPage';
import { gdsWalletService, type GdsWalletSummary } from '../../services/gds-wallet.service';
import { tmiService } from '../../services/tmi.service';
import { ApiClientError } from '../../services/api-client';

const wallet: GdsWalletSummary = {
  available: true, mode: 'sandbox', state: 'READY_SANDBOX',
  balance: { settledMinor: '100000', reservedMinor: '25000', availableMinor: '75000', currency: 'VND' },
  topupEnabled: true, paymentEnabled: false, recentTransactions: [],
};

async function renderPage(openEntry = true) {
  const view = render(<MemoryRouter><GdsWalletPage /></MemoryRouter>);
  await act(async () => { await Promise.resolve(); });
  const topup = screen.getByRole('button', { name: 'Nạp tiền' });
  if (openEntry && !(topup as HTMLButtonElement).disabled) {
    fireEvent.click(topup);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '100000' } });
  }
  return view;
}

beforeEach(() => {
  vi.spyOn(gdsWalletService, 'summary').mockResolvedValue(wallet);
  vi.spyOn(tmiService, 'wallet').mockResolvedValue({ current: 1234, earned: 2000, spent: 766, expired: 0 });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('PAYW-04D wallet QR presentation', () => {
  it('shows the unavailable balance error once and keeps history unavailable without inventing zero', async () => {
    vi.mocked(gdsWalletService.summary).mockRejectedValue(new ApiClientError('not found', 'NOT_FOUND', 404));
    render(<MemoryRouter><GdsWalletPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText('Hệ thống chưa cung cấp số dư Ví GDS cho tài khoản này.')).toHaveLength(1));
    expect(screen.getByText('Lịch sử giao dịch GDS sẽ hiển thị khi hệ thống sẵn sàng.')).toBeVisible();
    expect(screen.queryByText('0 ₫', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nạp tiền' })).toBeDisabled();
  });
  it('removes the sandbox badge, refresh button and footer, and displays actual TMI points', async () => {
    await renderPage(false);
    expect(await screen.findByText('75.000 ₫')).toBeVisible();
    expect(await screen.findByText('1.234 điểm')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Đổi điểm thưởng TMI' })).toHaveAttribute('href', '/dashboard/tmi');
    expect(screen.getByRole('heading', { name: 'Ví của tôi' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Nạp tiền vào ví' })).not.toBeInTheDocument();
    expect(screen.queryByText('Chưa khởi tạo', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText(/SANDBOX · CHƯA GIAO DỊCH THẬT/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Làm mới số dư/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/không hỗ trợ rút tiền tùy ý/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nạp tiền' })).toBeEnabled();
  });

  it('explains an empty wallet and still allows requesting a QR without a redundant topup link', async () => {
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValue({
      available: false, mode: 'sandbox', state: 'NOT_INITIALIZED',
      balance: null, topupEnabled: true, paymentEnabled: false, recentTransactions: [],
    });
    await renderPage();
    expect(await screen.findByText('Nạp tiền để bắt đầu sử dụng ví.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tạo mã QR' })).toBeEnabled();
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
    await renderPage();
    const field = screen.getByLabelText('Số tiền nạp (VND)');
    fireEvent.change(field, { target: { value: '250000' } });
    expect(screen.getByText('250.000 ₫', { selector: '.gds-topup-entry__total strong' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã QR' }));
    expect(await screen.findByRole('img', { name: /Mã QR cho yêu cầu nạp/ })).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    expect(screen.getByText('G0AB12CD3')).toBeVisible();
    expect(screen.getByText('123456789')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Mở trang thanh toán' })).toHaveAttribute('href', 'https://pay.payos.vn/web/payment_123');
    expect(screen.getByText('Chuyển đúng số tiền và nội dung trên mã QR.')).toBeVisible();
    expect(screen.getByText(/Đang chờ thanh toán/)).toBeVisible();
    expect(create).toHaveBeenCalledWith('250000', expect.any(String));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Mã QR cho yêu cầu nạp/ })).toBeVisible();
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
    await renderPage();
    expect(await screen.findByText('75.000 ₫')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã QR' }));
    expect(await screen.findByRole('img', { name: /Mã QR cho yêu cầu nạp/ })).toBeVisible();
    const getSummary = vi.mocked(gdsWalletService.summary);
    const initialCalls = getSummary.mock.calls.length;
    expect(globalThis.setInterval).toHaveBeenCalledWith(expect.any(Function), 3_000);
    expect(onPollingTick).not.toBeNull();
    await act(async () => { (onPollingTick as (() => void) | null)?.(); await Promise.resolve(); });
    expect(getSummary.mock.calls.length).toBeGreaterThan(initialCalls);
    expect(screen.getByText('75.000 ₫')).toBeVisible();
    expect(screen.queryByText('Đang tải…')).not.toBeInTheDocument();
  });

  it('does not request QR when wallet capability loading fails', async () => {
    vi.spyOn(gdsWalletService, 'summary').mockRejectedValue(new Error('offline'));
    const create = vi.spyOn(gdsWalletService, 'createPayosQr');
    await renderPage();
    expect(screen.getByRole('button', { name: 'Nạp tiền' })).toBeDisabled();
    expect(create).not.toHaveBeenCalled();
    expect(document.querySelector('.gds-wallet-page__balance-value')?.textContent).not.toContain('0');
  });

  it('rejects invalid input without calling the provider or displaying a QR', async () => {
    const create = vi.spyOn(gdsWalletService, 'createPayosQr');
    await renderPage();
    const field = screen.getByLabelText('Số tiền nạp (VND)');
    fireEvent.change(field, { target: { value: '1000' } });
    expect(screen.getByRole('button', { name: 'Tạo mã QR' })).toBeDisabled();
    fireEvent.change(field, { target: { value: '10000001' } });
    expect(screen.getByRole('button', { name: 'Tạo mã QR' })).toBeDisabled();
    expect(create).not.toHaveBeenCalled();
  });

  it('never renders a mismatched QR or falsely credits the balance', async () => {
    vi.spyOn(gdsWalletService, 'createPayosQr').mockResolvedValue({
      topupId: 'topup-1', amountMinor: '100001', currency: 'VND', transferMemo: 'G0AB12CD3',
      receivingAccount: '123456789', checkoutUrl: 'https://pay.payos.vn/web/abc',
      qrCodeDataUrl: 'data:image/png;base64,AAAA', expiresAt: '2026-11-02T12:15:00.000Z',
      status: 'AWAITING_TRANSFER', gdsCredited: false,
    });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã QR' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible());
    expect(screen.queryByRole('img', { name: /Mã QR cho yêu cầu nạp/ })).not.toBeInTheDocument();
  });

  it('displays journal entries accurately when available', async () => {
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValue({ ...wallet, recentTransactions: [
      { id: 'a', type: 'TOPUP_CREDIT', amountMinor: '100000', occurredAt: '2026-11-02T12:00:00.000Z' },
      { id: 'b', type: 'RESERVE', amountMinor: '25000', occurredAt: '2026-11-02T12:01:00.000Z' },
    ] });
    await renderPage();
    expect(await screen.findByText('+100.000 ₫')).toBeVisible();
    expect(screen.getByText('25.000 ₫')).toBeVisible();
  });

  it('does not fabricate TMI points when its service is unavailable', async () => {
    vi.spyOn(tmiService, 'wallet').mockRejectedValue(new Error('offline'));
    await renderPage(false);
    await waitFor(() => expect(document.querySelector('.gds-wallet-page__tmi-points')).toHaveTextContent('—'));
    expect(screen.queryByText('0 điểm')).not.toBeInTheDocument();
  });
});


it('displays a signed-backend QR with an opaque PayOS virtual account', async () => {
  const virtualAccount = 'VIRTUAL123456789012345678901234567890123';
  vi.spyOn(gdsWalletService, 'createPayosQr').mockResolvedValue({
    topupId: 'topup-virtual', amountMinor: '100000', currency: 'VND', transferMemo: 'G0AB12CD3',
    receivingAccount: virtualAccount, checkoutUrl: 'https://pay.payos.vn/web/virtual-link',
    qrCodeDataUrl: 'data:image/png;base64,AAAA', expiresAt: new Date(Date.now() + 900000).toISOString(),
    status: 'AWAITING_TRANSFER', gdsCredited: false,
  });
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: /Tạo mã QR/ }));
  expect(await screen.findByRole('img')).toBeVisible();
  expect(screen.getByText(virtualAccount)).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('retains a successful QR and prevents a second create for the displayed intent', async () => {
  const create = vi.spyOn(gdsWalletService, 'createPayosQr').mockResolvedValue({
    topupId: 'topup-repeat', amountMinor: '100000', currency: 'VND', transferMemo: 'G0AB12CD3',
    receivingAccount: '1234567890', checkoutUrl: 'https://pay.payos.vn/web/repeat-link',
    qrCodeDataUrl: 'data:image/png;base64,AAAA', expiresAt: new Date(Date.now() + 900000).toISOString(),
    status: 'AWAITING_TRANSFER', gdsCredited: false,
  });
  await renderPage();
  const button = screen.getByRole('button', { name: /Tạo mã QR/ });
  fireEvent.click(button);
  expect(await screen.findByRole('img')).toBeVisible();
  fireEvent.click(button);
  expect(create).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('img')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Về ví' }));
  fireEvent.click(screen.getByRole('button', { name: 'Nạp tiền' }));
  expect(screen.getByRole('img')).toBeVisible();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(create).toHaveBeenCalledTimes(1);
});

it.each(['CREDITED', 'CANCELLED'] as const)('allows another topup after %s without reusing the accepted intent', async status => {
  const topupId = '11111111-1111-4111-8111-111111111111';
  const qr = { topupId, amountMinor: '100000', currency: 'VND' as const, transferMemo: 'G0AB12CD3',
    receivingAccount: 'VIRTUAL-TEST', checkoutUrl: 'https://pay.payos.vn/web/test',
    qrCodeDataUrl: 'data:image/png;base64,AAAA', expiresAt: new Date(Date.now()+900000).toISOString(),
    status: 'AWAITING_TRANSFER' as const, gdsCredited: false as const };
  const create = vi.spyOn(gdsWalletService, 'createPayosQr').mockResolvedValueOnce(qr)
    .mockResolvedValueOnce({ ...qr, topupId: '22222222-2222-4222-8222-222222222222', amountMinor: '200000' });
  await renderPage();
  if (status === 'CREDITED') vi.mocked(gdsWalletService.summary).mockResolvedValue({ ...wallet, activeTopup: {
    topupId, amountMinor: '100000', currency: 'VND', status, gdsCredited: true, creditedAt: new Date().toISOString(),
  } });
  else vi.spyOn(gdsWalletService, 'cancelPayosTopup').mockResolvedValue({ topupId, status, gdsCredited: false });
  fireEvent.click(screen.getByRole('button', { name: 'Tạo mã QR' }));
  if (status === 'CREDITED') await screen.findByText('Nạp thành công');
  else {
    await screen.findByRole('img');
    fireEvent.click(screen.getByRole('button', { name: 'Hủy yêu cầu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));
    await screen.findByText('Yêu cầu nạp này đã được hủy.');
  }
  fireEvent.click(screen.getByRole('button', { name: 'Về ví' }));
  fireEvent.click(screen.getByRole('button', { name: 'Nạp tiền' }));
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Số tiền nạp (VND)'), { target: { value: '200000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tạo mã QR' }));
  expect(await screen.findByRole('img')).toBeVisible();
  expect(create).toHaveBeenCalledTimes(2);
  expect(create.mock.calls[1][0]).toBe('200000');
  expect(create.mock.calls[1][1]).not.toBe(create.mock.calls[0][1]);
});


it.each(['bad account', 'a'.repeat(129), ''])(
  'rejects malformed virtual-account facts instead of displaying a payment QR', async (receivingAccount) => {
    vi.spyOn(gdsWalletService, 'createPayosQr').mockResolvedValue({
      topupId: 'topup-invalid', amountMinor: '100000', currency: 'VND', transferMemo: 'G0AB12CD3',
      receivingAccount, checkoutUrl: 'https://pay.payos.vn/web/invalid-link',
      qrCodeDataUrl: 'data:image/png;base64,AAAA', expiresAt: new Date(Date.now() + 900000).toISOString(),
      status: 'AWAITING_TRANSFER', gdsCredited: false,
    });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Tạo mã QR/ }));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  },
);


it('announces exact topup credit, removes QR and stops its polling', async () => {
  let tick: (() => void) | undefined;
  vi.spyOn(globalThis, 'setInterval').mockImplementation((handler) => {
    if (typeof handler === 'function') tick = handler as () => void;
    return 456 as unknown as ReturnType<typeof setInterval>;
  });
  const clear = vi.spyOn(globalThis, 'clearInterval');
  const create = vi.spyOn(gdsWalletService, 'createPayosQr').mockResolvedValue({
    topupId: '11111111-1111-4111-8111-111111111111', amountMinor: '100000', currency: 'VND',
    transferMemo: 'G0AB12CD3', receivingAccount: 'VIRTUAL-1', checkoutUrl: 'https://pay.payos.vn/web/complete',
    qrCodeDataUrl: 'data:image/png;base64,AAAA', expiresAt: new Date(Date.now()+900000).toISOString(),
    status: 'AWAITING_TRANSFER', gdsCredited: false,
  });
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: /Tạo mã QR/ }));
  expect(await screen.findByRole('img')).toBeVisible();
  vi.mocked(gdsWalletService.summary).mockResolvedValue({ ...wallet,
    activeTopup: { topupId: '11111111-1111-4111-8111-111111111111', amountMinor: '100000',
      currency: 'VND', status: 'CREDITED', gdsCredited: true, creditedAt: new Date().toISOString() },
  } as unknown as GdsWalletSummary);
  await act(async () => { tick?.(); await Promise.resolve(); });
  expect(await screen.findByRole('status')).toHaveTextContent(/Nạp thành công/);
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Mua kh\u00f3a h\u1ecdc' })).toHaveAttribute('href', '/courses');
  expect(screen.getByRole('link', { name: 'G\u00f3i th\u00e0nh vi\u00ean' })).toHaveAttribute('href', '/membership');
  fireEvent.click(screen.getByRole('button', { name: 'V\u1ec1 v\u00ed' }));
  expect(screen.getByRole('button', { name: 'Nạp tiền' })).toBeEnabled();
  expect(clear).toHaveBeenCalledWith(456);
  expect(create).toHaveBeenCalledTimes(1);
  expect(gdsWalletService.summary).toHaveBeenLastCalledWith('11111111-1111-4111-8111-111111111111');
});

it.each([
  { topupId: '22222222-2222-4222-8222-222222222222', amountMinor: '100000', status: 'CREDITED', gdsCredited: true },
  { topupId: '11111111-1111-4111-8111-111111111111', amountMinor: '99999', status: 'CREDITED', gdsCredited: true },
  { topupId: '11111111-1111-4111-8111-111111111111', amountMinor: '100000', status: 'AWAITING_TRANSFER', gdsCredited: false },
])('does not infer success from a larger balance or unrelated/uncredited topup', async (activeTopup) => {
  let tick: (() => void) | undefined;
  vi.spyOn(globalThis, 'setInterval').mockImplementation((handler) => {
    if (typeof handler === 'function') tick = handler as () => void;
    return 789 as unknown as ReturnType<typeof setInterval>;
  });
  vi.spyOn(gdsWalletService, 'createPayosQr').mockResolvedValue({
    topupId: '11111111-1111-4111-8111-111111111111', amountMinor: '100000', currency: 'VND',
    transferMemo: 'G0AB12CD3', receivingAccount: 'VIRTUAL-1', checkoutUrl: 'https://pay.payos.vn/web/pending',
    qrCodeDataUrl: 'data:image/png;base64,AAAA', expiresAt: new Date(Date.now()+900000).toISOString(),
    status: 'AWAITING_TRANSFER', gdsCredited: false,
  });
  await renderPage(); fireEvent.click(screen.getByRole('button', { name: /Tạo mã QR/ }));
  expect(await screen.findByRole('img')).toBeVisible();
  vi.mocked(gdsWalletService.summary).mockResolvedValue({ ...wallet,
    balance: { settledMinor:'999999',reservedMinor:'0',availableMinor:'999999',currency:'VND' },
    activeTopup: { ...activeTopup,currency:'VND',creditedAt: new Date().toISOString() },
  } as unknown as GdsWalletSummary);
  await act(async () => { tick?.(); await Promise.resolve(); });
  expect(screen.getByRole('img')).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});


it('starts with an empty amount and offers explicit quick amounts', async () => {
  render(<MemoryRouter><GdsWalletPage /></MemoryRouter>);
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Nạp tiền' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Nạp tiền' }));
  expect(screen.getByRole('textbox')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Tạo mã QR' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '10.000 ₫' }));
  expect(screen.getByRole('textbox')).toHaveValue('10000');
  expect(screen.getByRole('button', { name: 'Tạo mã QR' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '20.000 ₫' })).toBeVisible();
  expect(screen.getByRole('button', { name: '50.000 ₫' })).toBeVisible();
});

it.each(['EXPIRED', 'REVIEW', 'RECONCILING', 'CANCELLED'] as const)(
  'keeps polling the exact intent after %s and accepts its later verified credit', async (status) => {
    let tick: (() => void) | undefined;
    const timerId = 901 as unknown as ReturnType<typeof setInterval>;
    const realSetInterval = globalThis.setInterval.bind(globalThis);
    vi.spyOn(globalThis, 'setInterval').mockImplementation((handler, delay, ...args) => {
      if (delay === 3_000 && typeof handler === 'function') {
        tick = handler as () => void;
        return timerId;
      }
      return realSetInterval(handler, delay, ...args);
    });
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const topupId = '11111111-1111-4111-8111-111111111111';
    const create = vi.spyOn(gdsWalletService, 'createPayosQr').mockResolvedValue({
      topupId, amountMinor: '100000', currency: 'VND', transferMemo: 'G0AB12CD3',
      receivingAccount: 'VIRTUAL-1', checkoutUrl: 'https://pay.payos.vn/web/poll-until-credited',
      qrCodeDataUrl: 'data:image/png;base64,AAAA',
      expiresAt: new Date(Date.now() - 120_000).toISOString(),
      status: 'AWAITING_TRANSFER', gdsCredited: false,
    });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Tạo mã QR/ }));
    expect(await screen.findByRole('img')).toBeVisible();
    const getSummary = vi.mocked(gdsWalletService.summary);
    getSummary.mockResolvedValue({ ...wallet, activeTopup: {
      topupId, amountMinor: '100000', currency: 'VND', status, gdsCredited: false, creditedAt: null,
    } });

    await act(async () => { tick?.(); await Promise.resolve(); });
    expect(getSummary).toHaveBeenLastCalledWith(topupId);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(clear).not.toHaveBeenCalledWith(timerId);

    getSummary.mockResolvedValue({ ...wallet,
      balance: { settledMinor: '175000', reservedMinor: '0', availableMinor: '175000', currency: 'VND' },
      activeTopup: { topupId, amountMinor: '100000', currency: 'VND', status: 'CREDITED',
        gdsCredited: true, creditedAt: new Date().toISOString() },
    });
    await act(async () => { tick?.(); await Promise.resolve(); });
    expect(getSummary).toHaveBeenLastCalledWith(topupId);
    expect(await screen.findByRole('status')).toBeVisible();
    expect(document.querySelector('.gds-wallet-page__balance-value')).toHaveTextContent('175.000');
    expect(clear).toHaveBeenCalledWith(timerId);
    expect(create).toHaveBeenCalledTimes(1);
  },
);

it('does not request a QR while an initial summary is pending or failed', async () => {
  let rejectInitial: ((error: Error) => void) | undefined;
  vi.mocked(gdsWalletService.summary).mockReturnValue(new Promise((_resolve, reject) => { rejectInitial = reject; }));
  const create = vi.spyOn(gdsWalletService, 'createPayosQr');
  await renderPage();
  expect(screen.getByRole('button', { name: 'Nạp tiền' })).toBeDisabled();
  await act(async () => { rejectInitial?.(new Error('initial request failed')); });
  expect(screen.getByRole('button', { name: 'Nạp tiền' })).toBeDisabled();
  expect(create).not.toHaveBeenCalled();
});

it('retains a verified initial summary when QR creation fails before an intent is accepted', async () => {
  const create = vi.spyOn(gdsWalletService, 'createPayosQr').mockRejectedValue(new Error('provider unavailable'));
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: /Tạo mã QR/ }));
  expect(await screen.findByRole('alert')).toBeVisible();
  expect(document.querySelector('.gds-wallet-page__balance-value')).toHaveTextContent('75.000');
  expect(gdsWalletService.summary).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledTimes(1);
});

it('reuses the same idempotency key when retrying an ambiguous network failure with the same amount', async () => {
  const create = vi.spyOn(gdsWalletService, 'createPayosQr').mockRejectedValueOnce(new Error('connection lost'))
    .mockResolvedValueOnce({ topupId: '11111111-1111-4111-8111-111111111111', amountMinor: '100000', currency: 'VND',
      transferMemo: 'G0AB12CD3', receivingAccount: 'VIRTUAL-TEST', checkoutUrl: 'https://pay.payos.vn/web/retry',
      qrCodeDataUrl: 'data:image/png;base64,AAAA', expiresAt: new Date(Date.now()+900000).toISOString(),
      status: 'AWAITING_TRANSFER', gdsCredited: false });
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'Tạo mã QR' }));
  expect(await screen.findByRole('alert')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Về ví' }));
  fireEvent.click(screen.getByRole('button', { name: 'Nạp tiền' }));
  expect(screen.getByLabelText('Số tiền nạp (VND)')).toHaveValue('100000');
  fireEvent.click(screen.getByRole('button', { name: 'Tạo mã QR' }));
  expect(await screen.findByRole('img')).toBeVisible();
  expect(create).toHaveBeenCalledTimes(2);
  expect(create.mock.calls[1]).toEqual(create.mock.calls[0]);
});

it.each(['cancelled', 'failed', 'mismatched'] as const)('handles %s cancellation without inventing provider state', async outcome => {
  let poll: (() => void) | undefined;
  const interval = globalThis.setInterval;
  vi.spyOn(globalThis, 'setInterval').mockImplementation((handler, timeout, ...args) => {
    if(timeout === 3000 && typeof handler === 'function') { poll = handler as () => void; return 978 as unknown as ReturnType<typeof setInterval>; }
    return interval(handler, timeout, ...args);
  });
  const id='11111111-1111-4111-8111-111111111111';
  vi.spyOn(gdsWalletService,'createPayosQr').mockResolvedValue({topupId:id,amountMinor:'100000',currency:'VND',transferMemo:'G0AB12CD3',receivingAccount:'VIRTUAL-TEST',checkoutUrl:'https://pay.payos.vn/web/test',qrCodeDataUrl:'data:image/png;base64,AAAA',expiresAt:new Date(Date.now()+900000).toISOString(),status:'AWAITING_TRANSFER',gdsCredited:false});
  const cancel=vi.spyOn(gdsWalletService,'cancelPayosTopup');
  if(outcome==='failed') cancel.mockRejectedValue(new Error('offline'));
  else cancel.mockResolvedValue({topupId:outcome==='mismatched'?'22222222-2222-4222-8222-222222222222':id,status:'CANCELLED',gdsCredited:false});
  await renderPage();
  fireEvent.click(screen.getByRole('button',{name:/Tạo mã QR/}));
  expect(await screen.findByRole('img')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Hủy yêu cầu'}));
  expect(cancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Xác nhận hủy'}));
  await waitFor(()=>expect(cancel).toHaveBeenCalledWith(id));
  if(outcome==='cancelled') {
    await waitFor(()=>expect(screen.queryByRole('img')).not.toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(/đã được hủy/);
  } else {
    expect(await screen.findByRole('alert')).toHaveTextContent(/Chưa thể hủy/);
    expect(screen.getByRole('img')).toBeVisible();
  }
  expect(screen.queryByText('Nạp thành công')).not.toBeInTheDocument();
  if(outcome==='failed') {
    vi.mocked(gdsWalletService.summary).mockResolvedValue({...wallet,activeTopup:{topupId:id,amountMinor:'100000',currency:'VND',status:'CREDITED',gdsCredited:true,creditedAt:new Date().toISOString()}});
    await act(async()=>{poll?.(); await Promise.resolve();});
    expect(await screen.findByRole('status')).toHaveTextContent('Nạp thành công');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  }
});
