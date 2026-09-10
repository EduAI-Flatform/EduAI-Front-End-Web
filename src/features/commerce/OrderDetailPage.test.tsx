import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commerceService, type CommerceOrderHistoryItem } from '../../services/commerce.service';
import { paymentService, type PaymentCheckoutState } from '../../services/payment.service';
import { OrderDetailPage } from './OrderDetailPage';

vi.mock('../../services/commerce.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/commerce.service')>()),
  commerceService: {
    getOrder: vi.fn(),
  },
}));

vi.mock('../../services/payment.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/payment.service')>()),
  paymentService: {
    create: vi.fn(),
    status: vi.fn(),
  },
}));

vi.mock('../payments/PaymentCheckout', () => ({
  PaymentCheckout: ({ initial, onStateChange }: {
    initial: PaymentCheckoutState;
    onStateChange?: (state: PaymentCheckoutState) => void;
  }) => (
    <button
      type="button"
      onClick={() => onStateChange?.({
        ...initial,
        orderStatus: 'CANCELLED',
        payment: initial.payment ? { ...initial.payment, status: 'CANCELLED' } : null,
      })}
    >
      Giả lập hủy thanh toán
    </button>
  ),
}));

const order: CommerceOrderHistoryItem = {
  id: 'order-id',
  orderNumber: 'EDU-ORDER-1',
  status: 'PENDING_PAYMENT',
  fulfillmentStatus: 'NOT_STARTED',
  subtotal: { amountMinor: '10000', currency: 'VND' },
  discount: { amountMinor: '0', currency: 'VND' },
  payable: { amountMinor: '10000', currency: 'VND' },
  paymentRequired: true,
  lines: [{
    id: 'line-id',
    productType: 'COURSE',
    productReferenceId: 'course-id',
    title: 'Khóa học thử nghiệm',
    quantity: 1,
    unitListPrice: { amountMinor: '10000', currency: 'VND' },
    finalPrice: { amountMinor: '10000', currency: 'VND' },
  }],
  payment: {
    id: 'attempt-id',
    status: 'PENDING',
    amount: { amountMinor: '10000', currency: 'VND' },
    expiresAt: '2028-08-26T12:00:00.000Z',
    createdAt: '2026-09-10T00:00:00.000Z',
  },
  createdAt: '2026-09-10T00:00:00.000Z',
  updatedAt: '2026-09-10T00:00:00.000Z',
  confirmedAt: null,
  cancelledAt: null,
  expiredAt: null,
};

const pendingPayment: PaymentCheckoutState = {
  orderId: 'order-id',
  orderNumber: 'EDU-ORDER-1',
  orderStatus: 'PENDING_PAYMENT',
  paymentRequired: true,
  payment: {
    id: 'attempt-id',
    status: 'PENDING',
    amount: { amountMinor: '10000', currency: 'VND' },
    expiresAt: '2028-08-26T12:00:00.000Z',
  },
};

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(commerceService.getOrder).mockResolvedValue(order);
    vi.mocked(paymentService.status).mockResolvedValue(pendingPayment);
  });

  it('updates the top order status immediately when checkout reports a canonical cancellation', async () => {
    render(
      <MemoryRouter initialEntries={['/orders/order-id']}>
        <Routes>
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Chờ thanh toán')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Giả lập hủy thanh toán' }));

    expect(screen.getByText('Đã hủy thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Yêu cầu thanh toán đã được hủy')).toBeInTheDocument();
    expect(screen.queryByText('Chờ thanh toán')).not.toBeInTheDocument();
  });
});
