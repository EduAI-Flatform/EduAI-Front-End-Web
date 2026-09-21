import { render, screen } from '@testing-library/react';
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
    cancel: vi.fn(),
  },
}));

const order: CommerceOrderHistoryItem = {
  id: 'vnpay-order-id',
  orderNumber: 'EDU-COURSE-VNPAY',
  status: 'PENDING_PAYMENT',
  fulfillmentStatus: 'NOT_STARTED',
  subtotal: { amountMinor: '200000', currency: 'VND' },
  discount: { amountMinor: '0', currency: 'VND' },
  payable: { amountMinor: '200000', currency: 'VND' },
  paymentRequired: true,
  lines: [{
    id: 'course-line-id',
    productType: 'COURSE',
    productReferenceId: 'course-id',
    title: 'Khóa học VNPay',
    quantity: 1,
    unitListPrice: { amountMinor: '200000', currency: 'VND' },
    finalPrice: { amountMinor: '200000', currency: 'VND' },
  }],
  payment: {
    id: 'vnpay-attempt-id',
    status: 'PENDING',
    amount: { amountMinor: '200000', currency: 'VND' },
    expiresAt: '2028-08-26T12:00:00.000Z',
    createdAt: '2026-09-10T00:00:00.000Z',
  },
  createdAt: '2026-09-10T00:00:00.000Z',
  updatedAt: '2026-09-10T00:00:00.000Z',
  confirmedAt: null,
  cancelledAt: null,
  expiredAt: null,
};

const vnpayPayment: PaymentCheckoutState = {
  orderId: 'vnpay-order-id',
  orderNumber: 'EDU-COURSE-VNPAY',
  orderStatus: 'PENDING_PAYMENT',
  paymentRequired: true,
  payment: {
    id: 'vnpay-attempt-id',
    status: 'PENDING',
    amount: { amountMinor: '200000', currency: 'VND' },
    expiresAt: '2028-08-26T12:00:00.000Z',
    provider: 'vnpay',
    checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=vnpay-order-id',
  },
};

describe('OrderDetailPage VNPay checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(commerceService.getOrder).mockResolvedValue(order);
    vi.mocked(paymentService.status).mockResolvedValue(vnpayPayment);
  });

  it('renders the provider returned by the backend for a course order', async () => {
    render(
      <MemoryRouter initialEntries={['/orders/vnpay-order-id']}>
        <Routes>
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Tiếp tục thanh toán VNPay' })).toBeInTheDocument();
    expect(screen.queryByText(/PayOS/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(paymentService.status).toHaveBeenCalledWith('vnpay-order-id');
  });
});
