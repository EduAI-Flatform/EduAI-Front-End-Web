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

describe('PaymentReturnPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(paymentService.status).mockResolvedValue(authoritativePending);
  });

  it('ignores provider success parameters and renders only learner-owned server status', async () => {
    renderPage(`/payments/return?orderId=${orderId}&status=PAID&code=00`);

    expect(await screen.findByRole('heading', { name: 'EDU-ORDER-1' })).toBeInTheDocument();
    expect(screen.getByText(/Chờ thanh toán/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Đã thanh toán$/i)).not.toBeInTheDocument();
    expect(paymentService.status).toHaveBeenCalledWith(orderId);
  });

  it('treats the provider cancel redirect as presentation and performs no cancellation mutation', async () => {
    renderPage(`/payments/cancel?orderId=${orderId}&cancel=true`);

    expect(await screen.findByRole('heading', { name: 'EDU-ORDER-1' })).toBeInTheDocument();
    expect(paymentService.cancel).not.toHaveBeenCalled();
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
