import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentService, type PaymentCheckoutState } from '../../services/payment.service';
import { PaymentReturnPage } from './PaymentReturnPage';

vi.mock('../../services/payment.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/payment.service')>()),
  paymentService: {
    status: vi.fn(),
    cancel: vi.fn(),
  },
}));

const orderId = '11111111-1111-4111-8111-111111111111';
const authoritativePending: PaymentCheckoutState = {
  orderId,
  orderNumber: 'EDU-ORDER-1',
  orderStatus: 'PENDING_PAYMENT',
  paymentRequired: true,
  payment: {
    id: 'attempt-id',
    status: 'PENDING',
    amount: { amountMinor: '200000', currency: 'VND' },
    expiresAt: '2028-08-26T12:00:00.000Z',
  },
};

function stateFor(status: string): PaymentCheckoutState {
  const terminalOrderStatus = status === 'PAID' ? 'CONFIRMED' : status === 'CANCELLED' ? 'CANCELLED' : 'PENDING_PAYMENT';
  return {
    ...authoritativePending,
    orderStatus: terminalOrderStatus,
    payment: {
      ...authoritativePending.payment!,
      status,
    },
  };
}

describe('PaymentReturnPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(paymentService.status).mockResolvedValue(authoritativePending);
  });

  it('ignores provider success parameters and renders only learner-owned server status', async () => {
    renderPage(`/payments/return?orderId=${orderId}&vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_Amount=1&vnp_BankCode=attacker-bank&vnp_OrderInfo=attacker-order&vnp_TxnRef=attacker-value&vnp_TransactionNo=attacker-transaction&vnp_PayDate=19990101000000&vnp_SecureHash=fake`);

    expect(await screen.findByRole('heading', { name: 'EDU-ORDER-1' })).toBeInTheDocument();
    expect(screen.getAllByText(/^Chờ thanh toán$/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Đã thanh toán$/i)).not.toBeInTheDocument();
    expect(paymentService.status).toHaveBeenCalledWith(orderId);
    expect(paymentService.status).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/200\.000/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Đã quay lại từ cổng thanh toán' })).toBeInTheDocument();
    expect(screen.getByText(/Thông tin trên đường dẫn không xác nhận giao dịch/i)).toBeInTheDocument();
  });

  it('treats the provider cancel redirect as presentation and performs no cancellation mutation', async () => {
    renderPage(`/payments/cancel?orderId=${orderId}&cancel=true`);

    expect(await screen.findByRole('heading', { name: 'EDU-ORDER-1' })).toBeInTheDocument();
    expect(paymentService.cancel).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Đã quay lại từ bước hủy thanh toán' })).toBeInTheDocument();
  });

  it.each([
    ['PAID', /Thanh toán đã xác nhận/i],
    ['FAILED', /Yêu cầu thanh toán không thành công/i],
    ['CANCELLED', /Đã hủy thanh toán/i],
    ['EXPIRED', /Đã hết hạn thanh toán/i],
    ['LATE_PAID', /Thanh toán cần đối soát/i],
  ])('renders the server-confirmed %s state', async (status, expected) => {
    vi.mocked(paymentService.status).mockResolvedValue(stateFor(status));

    renderPage(`/payments/return?orderId=${orderId}&vnp_ResponseCode=99&vnp_TransactionStatus=02`);

    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(paymentService.status).toHaveBeenCalledWith(orderId);
  });

  it('keeps backend PAID authoritative on the cancel route', async () => {
    vi.mocked(paymentService.status).mockResolvedValue(stateFor('PAID'));

    renderPage(`/payments/cancel?orderId=${orderId}&vnp_ResponseCode=99&vnp_TransactionStatus=02`);

    expect(await screen.findByText(/Thanh toán đã xác nhận/i)).toBeInTheDocument();
    expect(screen.queryByText(/Đã hủy thanh toán/i)).not.toBeInTheDocument();
  });

  it('keeps backend CANCELLED authoritative on the return route', async () => {
    vi.mocked(paymentService.status).mockResolvedValue(stateFor('CANCELLED'));

    renderPage(`/payments/return?orderId=${orderId}&vnp_ResponseCode=00&vnp_TransactionStatus=00`);

    expect(await screen.findByText(/Đã hủy thanh toán/i)).toBeInTheDocument();
    expect(screen.queryByText(/Thanh toán đã xác nhận/i)).not.toBeInTheDocument();
  });

  it('does not request status when orderId is missing', async () => {
    renderPage('/payments/return?vnp_ResponseCode=00&vnp_TxnRef=attacker-value');

    expect(await screen.findByRole('alert')).toHaveTextContent(/Định danh đơn hàng không hợp lệ/i);
    expect(paymentService.status).not.toHaveBeenCalled();
  });

  it('rejects a missing or malformed local order identity without an API call', async () => {
    renderPage('/payments/return?orderId=provider-controlled');

    expect(await screen.findByRole('alert')).toHaveTextContent(/không hợp lệ/i);
    expect(paymentService.status).not.toHaveBeenCalled();
  });

  it('shows a safe retryable error without rendering provider query data', async () => {
    vi.mocked(paymentService.status).mockRejectedValue(new Error('safe failure'));
    renderPage(`/payments/return?orderId=${orderId}&accountNumber=secret-provider-data`);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText(/secret-provider-data/i)).not.toBeInTheDocument();
  });
});

function renderPage(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<PaymentReturnPage />} path="/payments/return" />
        <Route element={<PaymentReturnPage />} path="/payments/cancel" />
      </Routes>
    </MemoryRouter>,
  );
}
