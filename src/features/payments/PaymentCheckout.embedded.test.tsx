import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentService, type PaymentCheckoutState } from '../../services/payment.service';
import { PaymentCheckout } from './PaymentCheckout';

vi.mock('../../services/payment.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/payment.service')>()),
  paymentService: {
    create: vi.fn(),
    status: vi.fn(),
    cancel: vi.fn(),
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
  },
};

type PayOSConfig = {
  CHECKOUT_URL: string;
  ELEMENT_ID: string;
  RETURN_URL: string;
  embedded: true;
  onSuccess?: (event: unknown) => Promise<void>;
  onCancel?: (event: unknown) => void;
  onExit?: (event: unknown) => void;
};

const payOS = () => (window as typeof window & {
  PayOSCheckout?: {
    usePayOS: ReturnType<typeof vi.fn<(config: PayOSConfig) => {
      exit: () => void;
      open: () => void;
    }>>;
  };
}).PayOSCheckout;

describe('PaymentCheckout embedded payOS flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as typeof window & { PayOSCheckout?: unknown }).PayOSCheckout = {
      usePayOS: vi.fn(() => ({ exit: vi.fn(), open: vi.fn() })),
    };
  });

  afterEach(() => {
    delete (window as typeof window & { PayOSCheckout?: unknown }).PayOSCheckout;
  });

  it('mounts embedded checkout without opening or navigating to hosted PayOS', async () => {
    const user = userEvent.setup();
    const openWindow = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<PaymentCheckout initial={pending} />);

    await user.click(screen.getByRole('button', { name: /Thanh to/ }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(payOS()?.usePayOS).toHaveBeenCalledTimes(1));
    expect(payOS()?.usePayOS).toHaveBeenCalledWith(expect.objectContaining({
      CHECKOUT_URL: pending.payment?.checkoutUrl,
      ELEMENT_ID: expect.stringMatching(/^payos-checkout-/),
      RETURN_URL: window.location.href,
      embedded: true,
    }));
    expect(openWindow).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: /payos/i })).not.toBeInTheDocument();
  });

  it('re-fetches canonical state after success without trusting the callback', async () => {
    const user = userEvent.setup();
    vi.mocked(paymentService.status).mockResolvedValue(pending);
    render(<PaymentCheckout initial={pending} />);
    await user.click(screen.getByRole('button', { name: /Thanh to/ }));
    await waitFor(() => expect(payOS()?.usePayOS).toHaveBeenCalled());
    const config = payOS()!.usePayOS.mock.calls[0][0];

    await act(async () => {
      await config.onSuccess?.({ status: 'PAID' });
    });

    expect(paymentService.status).toHaveBeenCalledWith(pending.orderId);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('cleans up and reopens without creating another payment request', async () => {
    const user = userEvent.setup();
    const exit = vi.fn();
    payOS()!.usePayOS.mockReturnValue({ exit, open: vi.fn() });
    render(<PaymentCheckout initial={pending} />);

    await user.click(screen.getByRole('button', { name: /Thanh to/ }));
    await waitFor(() => expect(payOS()?.usePayOS).toHaveBeenCalledTimes(1));
    const staleExit = payOS()!.usePayOS.mock.calls[0][0].onExit;
    await user.click(screen.getByRole('button', { name: /ng thanh to/ }));
    expect(exit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Thanh to/ }));
    await waitFor(() => expect(payOS()?.usePayOS).toHaveBeenCalledTimes(2));
    await act(async () => {
      staleExit?.({});
      await Promise.resolve();
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(paymentService.create).not.toHaveBeenCalled();
  });

  it('re-fetches canonical state for cancel and exit callbacks', async () => {
    const user = userEvent.setup();
    vi.mocked(paymentService.status).mockResolvedValue(pending);
    render(<PaymentCheckout initial={pending} />);
    await user.click(screen.getByRole('button', { name: /Thanh to/ }));
    await waitFor(() => expect(payOS()?.usePayOS).toHaveBeenCalled());
    const config = payOS()!.usePayOS.mock.calls[0][0];

    await act(async () => {
      config.onCancel?.({ status: 'CANCELLED' });
      await Promise.resolve();
    });
    expect(paymentService.status).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      config.onExit?.({});
      await Promise.resolve();
    });
    expect(paymentService.status).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes only after the backend confirms PAID', async () => {
    const user = userEvent.setup();
    vi.mocked(paymentService.status).mockResolvedValue({
      ...pending,
      orderStatus: 'CONFIRMED',
      payment: { ...pending.payment!, status: 'PAID' },
    });
    render(<PaymentCheckout initial={pending} />);
    await user.click(screen.getByRole('button', { name: /Thanh to/ }));
    await waitFor(() => expect(payOS()?.usePayOS).toHaveBeenCalled());
    const config = payOS()!.usePayOS.mock.calls[0][0];

    await act(async () => {
      await config.onSuccess?.({ status: 'PAID' });
    });

    expect(paymentService.status).toHaveBeenCalledWith(pending.orderId);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thanh to/ })).not.toBeInTheDocument();
  });

  it('shows an error state instead of a blank checkout when the SDK is unavailable', async () => {
    const user = userEvent.setup();
    delete (window as typeof window & { PayOSCheckout?: unknown }).PayOSCheckout;
    render(<PaymentCheckout initial={pending} />);

    await user.click(screen.getByRole('button', { name: /Thanh to/ }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
