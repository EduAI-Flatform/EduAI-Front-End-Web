import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
      id: 'line-id',
      productId: 'product-id',
      course: { id: 'course-id', title: 'AI an toàn', slug: 'ai-an-toan', thumbnailUrl: null },
      unitPrice: { amountMinor: '250000', currency: 'VND' },
      quantity: 1,
      availability: 'AVAILABLE',
      warnings: [],
    },
  ],
  summary: {
    amountMinor: '250000',
    currency: 'VND',
    itemCount: 1,
    canCheckout: true,
  },
};

describe('CartPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a useful empty state', async () => {
    vi.mocked(commerceService.getCart).mockResolvedValue({
      ...cart,
      id: null,
      items: [],
      summary: { ...cart.summary, amountMinor: '0', itemCount: 0, canCheckout: false },
    });

    render(<MemoryRouter><CartPage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Giỏ hàng đang trống' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khám phá khóa học' })).toBeInTheDocument();
  });

  it('renders only server-returned totals and the perpetual-access warning', async () => {
    vi.mocked(commerceService.getCart).mockResolvedValue(cart);

    render(<MemoryRouter><CartPage /></MemoryRouter>);

    expect(await screen.findByText('AI an toàn')).toBeInTheDocument();
    expect(screen.getAllByText(/250\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Quyền mua riêng là vĩnh viễn/)).toBeInTheDocument();
  });

  it('submits voucher identities and presents the server-created pending order', async () => {
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

    render(<MemoryRouter><CartPage /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('Voucher cho khóa học này'), {
      target: { value: 'SAVE20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đơn hàng' }));

    await waitFor(() =>
      expect(commerceService.createOrder).toHaveBeenCalledWith([
        { courseId: 'course-id', code: 'SAVE20' },
      ]),
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'EDU-ORDER-1' })).toBeInTheDocument();
    expect(paymentService.create).toHaveBeenCalledWith('order-id');
    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,cXItY29kZQ==');
    expect(screen.getAllByText(/200\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/không tự xác nhận đơn/)).toBeInTheDocument();
  });
});
