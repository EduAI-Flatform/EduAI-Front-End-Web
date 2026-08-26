import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentService, type PaymentCheckoutState } from '../../services/payment.service';
import { PaymentCheckout } from './PaymentCheckout';

vi.mock('../../services/payment.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/payment.service')>()),
  paymentService: {
    create: vi.fn(),
    status: vi.fn(),
  },
}));

const pending: PaymentCheckoutState = {
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
};

describe('PaymentCheckout', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('renders only server-returned payment facts and explains settlement authority', () => {
    render(<PaymentCheckout initial={pending} />);

    expect(screen.getByRole('heading', { name: 'EDU-ORDER-1' })).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', pending.payment?.qrCodeDataUrl);
    expect(screen.getByRole('link')).toHaveAttribute('href', pending.payment?.checkoutUrl);
    expect(screen.getByText(/200\.000/)).toBeInTheDocument();
    expect(screen.getByText(/webhook/i)).toBeInTheDocument();
  });

  it('does not render unsafe provider URLs or non-PNG QR payloads', () => {
    render(<PaymentCheckout initial={{
      ...pending,
      payment: {
        ...pending.payment!,
        checkoutUrl: 'javascript:alert(1)',
        qrCodeDataUrl: 'data:image/svg+xml;base64,PHN2Zz4=',
      },
    }} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('polls local state without losing the original safe QR and checkout URL', async () => {
    vi.useFakeTimers();
    vi.mocked(paymentService.status).mockResolvedValue({
      ...pending,
      orderStatus: 'CONFIRMED',
      payment: {
        id: 'attempt-id',
        status: 'PAID',
        amount: { amountMinor: '200000', currency: 'VND' },
        expiresAt: '2028-08-26T12:00:00.000Z',
      },
    });
    render(<PaymentCheckout initial={pending} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(paymentService.status).toHaveBeenCalledWith('order-id');
    expect(screen.getByRole('img')).toHaveAttribute('src', pending.payment?.qrCodeDataUrl);
    expect(screen.getByRole('link')).toHaveAttribute('href', pending.payment?.checkoutUrl);
  });

  it('shows the server-confirmed no-payment path without provider facts', () => {
    render(<PaymentCheckout initial={{
      orderId: 'order-id',
      orderNumber: 'EDU-FREE-1',
      orderStatus: 'CONFIRMED',
      paymentRequired: false,
      payment: null,
    }} />);

    expect(screen.getByRole('status')).toHaveTextContent('EDU-FREE-1');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
