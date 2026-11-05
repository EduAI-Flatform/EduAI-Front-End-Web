import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commerceService, type CommerceOrderHistoryItem } from '../../services/commerce.service';
import { paymentService, type PaymentCheckoutState } from '../../services/payment.service';
import { gdsWalletService } from '../../services/gds-wallet.service';
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
    cancelOrder: vi.fn(),
    methods: vi.fn(),
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
    provider: 'payos',
  },
};

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(commerceService.getOrder).mockResolvedValue(order);
    vi.mocked(paymentService.status).mockResolvedValue(pendingPayment);
    vi.mocked(paymentService.methods).mockResolvedValue(['payos', 'vnpay']);
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValue({
      available: false, mode: 'disabled', state: 'UNAVAILABLE', balance: null,
      paymentEnabled: false, topupEnabled: false,
    });
  });

  it('clears a stale inherited GDS failure after the server confirms fulfilled membership payment', async () => {
    vi.mocked(commerceService.getOrder).mockResolvedValue({
      ...order, status: 'CONFIRMED', fulfillmentStatus: 'FULFILLED', payment: null,
    });
    render(<MemoryRouter initialEntries={[{ pathname: '/orders/order-id', state: { gdsPaymentError: 'Stale GDS failure' } }]}>
      <Routes><Route path="/orders/:orderId" element={<OrderDetailPage />} /></Routes>
    </MemoryRouter>);
    await screen.findByRole('heading', { name: order.orderNumber });
    expect(screen.queryByText('Stale GDS failure')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(paymentService.create).not.toHaveBeenCalled();
  });

  it('requires the learner to choose PayOS or another enabled method before creating QR', async () => {
    vi.mocked(commerceService.getOrder).mockResolvedValue({ ...order, payment: null });
    vi.mocked(paymentService.create).mockResolvedValue(pendingPayment);
    render(
      <MemoryRouter initialEntries={['/orders/order-id']}>
        <Routes><Route path="/orders/:orderId" element={<OrderDetailPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('button', { name: 'Chọn phương thức thanh toán' })).toBeDisabled();
    expect(paymentService.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: /Quét mã QR/ }));
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán 10\.000/ }));
    await waitFor(() => expect(paymentService.create).toHaveBeenCalledWith('order-id', undefined, 'payos'));
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

  it('pays once with GDS and shows the confirmed order without creating a PayOS attempt', async () => {
    vi.stubEnv('VITE_GDS_UAT_CHECKOUT_ENABLED', 'true');
    const unpaid = { ...order, payment: null };
    vi.mocked(commerceService.getOrder).mockResolvedValueOnce(unpaid).mockResolvedValue({
      ...unpaid, status: 'CONFIRMED', fulfillmentStatus: 'FULFILLED',
    });
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValueOnce({
      available: true, mode: 'sandbox', state: 'READY_SANDBOX',
      balance: { settledMinor: '100000', reservedMinor: '0', availableMinor: '100000', currency: 'VND' },
      paymentEnabled: true, topupEnabled: false,
    });
    const capture = vi.spyOn(gdsWalletService, 'payOrder').mockResolvedValueOnce({
      orderId: 'order-id', status: 'CONFIRMED', amountMinor: '10000', currency: 'VND',
    });
    render(
      <MemoryRouter initialEntries={['/orders/order-id']}>
        <Routes><Route path="/orders/:orderId" element={<OrderDetailPage />} /></Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('radio', { name: /Ví GDS/ }));
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán 10\.000/ }));
    await waitFor(() => expect(capture).toHaveBeenCalledWith('order-id'));
    expect(paymentService.create).not.toHaveBeenCalled();
    expect(await screen.findByText('Đã xác nhận')).toBeInTheDocument();
    vi.unstubAllEnvs();
  });
  it('confirms cancellation of an unpaid order and then hides payment controls', async () => {
    const unpaid={...order,payment:null};
    vi.mocked(commerceService.getOrder).mockResolvedValueOnce(unpaid).mockResolvedValue({...unpaid,status:'CANCELLED'});
    vi.mocked(paymentService.cancelOrder).mockResolvedValue({orderId:'order-id',orderStatus:'CANCELLED',paymentStatus:null});
    render(<MemoryRouter initialEntries={['/orders/order-id']}><Routes><Route path="/orders/:orderId" element={<OrderDetailPage />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button',{name:'Hủy đơn'}));
    expect(paymentService.cancelOrder).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Xác nhận hủy đơn'}));
    await waitFor(()=>expect(paymentService.cancelOrder).toHaveBeenCalledWith('order-id'));
    expect(await screen.findByText('Đã hủy thanh toán')).toBeVisible();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('keeps an unpaid order payable when cancellation fails', async () => {
    vi.mocked(commerceService.getOrder).mockResolvedValue({...order,payment:null});
    vi.mocked(paymentService.cancelOrder).mockRejectedValue(new Error('offline'));
    render(<MemoryRouter initialEntries={['/orders/order-id']}><Routes><Route path="/orders/:orderId" element={<OrderDetailPage />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button',{name:'Hủy đơn'}));
    fireEvent.click(screen.getByRole('button',{name:'Xác nhận hủy đơn'}));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByText('Chờ thanh toán')).toBeVisible();
    expect(screen.queryByText('Đã hủy thanh toán')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Hủy đơn'})).toBeEnabled();
  });

 it('labels a membership renewal and displays its server-owned period',async()=>{
  vi.mocked(commerceService.getOrder).mockResolvedValue({...order,payment:null,membership:{action:'RENEW',durationMonths:1,startsAt:'2026-12-03T00:00:00Z',endsAt:'2027-01-03T00:00:00Z'}});
  render(<MemoryRouter initialEntries={['/orders/order-id']}><Routes><Route path="/orders/:orderId" element={<OrderDetailPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading',{name:'Gia hạn gói thành viên'})).toBeVisible();
  expect(screen.getByRole('region',{name:'Thời hạn gói thành viên'})).toHaveTextContent(/2026/);
  expect(screen.getByRole('region',{name:'Thời hạn gói thành viên'})).toHaveTextContent(/2027/);
 });

});
