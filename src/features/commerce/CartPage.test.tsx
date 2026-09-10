import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartPage } from './CartPage';
import { commerceService, type CommerceCart } from '../../services/commerce.service';
import { paymentService } from '../../services/payment.service';

vi.mock('../../services/payment.service', async () => {
  const actual = await vi.importActual<typeof import('../../services/payment.service')>(
    '../../services/payment.service',
  );
  return {
    ...actual,
    paymentService: {
      create: vi.fn(),
      pending: vi.fn(),
      status: vi.fn(),
    },
  };
});

vi.mock('../../services/commerce.service', async () => {
  const actual = await vi.importActual<typeof import('../../services/commerce.service')>(
    '../../services/commerce.service',
  );
  return {
    ...actual,
    commerceService: {
      getCart: vi.fn(),
      removeCourse: vi.fn(),
      clearCart: vi.fn(),
      createOrder: vi.fn(),
    },
  };
});

const cart: CommerceCart = {
  id: 'cart-id',
  status: 'ACTIVE',
  currency: 'VND',
  items: [
    {
      id: 'line-id-1',
      productId: 'product-id-1',
      course: { id: 'course-id-1', title: 'AI an toàn', slug: 'ai-an-toan', thumbnailUrl: null },
      unitPrice: { amountMinor: '250000', currency: 'VND' },
      quantity: 1,
      availability: 'AVAILABLE',
      warnings: [],
    },
    {
      id: 'line-id-2',
      productId: 'product-id-2',
      course: { id: 'course-id-2', title: 'AI thực hành', slug: 'ai-thuc-hanh', thumbnailUrl: null },
      unitPrice: { amountMinor: '100000', currency: 'VND' },
      quantity: 1,
      availability: 'AVAILABLE',
      warnings: [],
    },
  ],
  summary: {
    subtotalAmountMinor: '350000',
    currency: 'VND',
    itemCount: 2,
    canCheckout: true,
  },
};

describe('CartPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(paymentService.pending).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('renders a useful empty state', async () => {
    vi.mocked(commerceService.getCart).mockResolvedValue({
      ...cart,
      id: null,
      items: [],
      summary: { ...cart.summary, subtotalAmountMinor: '0', itemCount: 0, canCheckout: false },
    });

    render(<MemoryRouter><CartPage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Giỏ hàng đang trống' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khám phá khóa học' })).toBeInTheDocument();
  });

  it('shows server-backed prices and selects available courses by default', async () => {
    vi.mocked(commerceService.getCart).mockResolvedValue(cart);

    render(<MemoryRouter><CartPage /></MemoryRouter>);

    expect(await screen.findByText('AI an toàn')).toBeInTheDocument();
    expect(screen.getByText('2/2 khóa học đã chọn')).toBeInTheDocument();
    expect(screen.getByText('2 khóa học được chọn')).toBeInTheDocument();
    expect(screen.getByText(/350\.000/)).toBeInTheDocument();
    expect(screen.queryByText('Tổng dự kiến')).not.toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Chọn AI an toàn để thanh toán')).toBeChecked();
    expect(screen.getByLabelText('Chọn AI thực hành để thanh toán')).toBeChecked();
  });

  it('updates the selected subtotal and leaves unchecked courses out of checkout', async () => {
    vi.mocked(commerceService.getCart).mockResolvedValue(cart);
    vi.mocked(commerceService.createOrder).mockResolvedValue({
      id: 'order-id',
      orderNumber: 'EDU-ORDER-1',
      status: 'PENDING_PAYMENT',
      fulfillmentStatus: 'NOT_STARTED',
      subtotal: { amountMinor: '250000', currency: 'VND' },
      discount: { amountMinor: '50000', currency: 'VND' },
      payable: { amountMinor: '200000', currency: 'VND' },
      pricingPolicyVersion: 'course-v1-single-promotion',
      lines: [],
    });
    vi.mocked(paymentService.create).mockResolvedValue({
      orderId: 'order-id',
      orderNumber: 'EDU-ORDER-1',
      orderStatus: 'PENDING_PAYMENT',
      paymentRequired: true,
      payment: {
        id: 'attempt-id',
        status: 'PENDING',
        amount: { amountMinor: '200000', currency: 'VND' },
        expiresAt: '2028-08-26T12:00:00.000Z',
        checkoutUrl: 'https://pay.payos.vn/web/order-id',
        qrCodeDataUrl: 'data:image/png;base64,cXItY29kZQ==',
      },
    });

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <Routes>
          <Route element={<CartPage />} path="/cart" />
          <Route element={<h1>Chi tiết đơn hàng</h1>} path="/orders/:orderId" />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('AI an toàn');
    fireEvent.click(screen.getByLabelText('Chọn AI thực hành để thanh toán'));
    expect(screen.getByText('1/2 khóa học đã chọn')).toBeInTheDocument();
    expect(screen.getByText(/1 khóa học chưa chọn sẽ vẫn ở trong giỏ/)).toBeInTheDocument();
    const summary = screen.getByRole('complementary');
    expect(within(summary).getByText(/250\.000/)).toBeInTheDocument();

    fireEvent.change(screen.getAllByLabelText('Voucher')[0], {
      target: { value: 'SAVE20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán 1 khóa học' }));

    await waitFor(() =>
      expect(commerceService.createOrder).toHaveBeenCalledWith(
        ['course-id-1'],
        [{ courseId: 'course-id-1', code: 'SAVE20' }],
      ),
    );
    expect(paymentService.create).toHaveBeenCalledWith('order-id');
    expect(await screen.findByRole('heading', { level: 1, name: 'Chi tiết đơn hàng' })).toBeInTheDocument();
  });

  it('disables checkout when no course is selected', async () => {
    vi.mocked(commerceService.getCart).mockResolvedValue(cart);

    render(<MemoryRouter><CartPage /></MemoryRouter>);
    await screen.findByText('AI an toàn');
    fireEvent.click(screen.getByLabelText('Chọn tất cả'));

    expect(screen.getByText('0/2 khóa học đã chọn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chọn khóa học để thanh toán' })).toBeDisabled();
    expect(commerceService.createOrder).not.toHaveBeenCalled();
  });

  it('shows a learner-owned pending payment again after returning to the cart', async () => {
    vi.mocked(commerceService.getCart).mockResolvedValue({
      ...cart,
      id: null,
      items: [],
      summary: { ...cart.summary, subtotalAmountMinor: '0', itemCount: 0, canCheckout: false },
    });
    vi.mocked(paymentService.pending).mockResolvedValue({
      items: [{
        orderId: 'order-id',
        orderNumber: 'EDU-COURSE-10K',
        orderStatus: 'PENDING_PAYMENT',
        paymentRequired: true,
        payment: {
          id: 'attempt-id',
          status: 'PENDING',
          amount: { amountMinor: '10000', currency: 'VND' },
          expiresAt: '2028-08-26T12:00:00.000Z',
          checkoutUrl: 'https://pay.payos.vn/web/provider-payment-id',
        },
      }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    render(<MemoryRouter><CartPage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Bạn có 1 đơn đang chờ thanh toán' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mở đơn này/ })).toHaveAttribute('href', '/orders/order-id');
    expect(screen.getByRole('link', { name: 'Tất cả đơn hàng' })).toHaveAttribute('href', '/orders');
    expect(paymentService.create).not.toHaveBeenCalled();
  });
});
