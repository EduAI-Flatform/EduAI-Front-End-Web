import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render, screen, waitFor } from '@testing-library/react';
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
  onSuccess?: (event: unknown) => void;
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
    document.querySelectorAll('script[data-payos-checkout-sdk]').forEach((node) => node.remove());
  });

  it('keeps the third-party payOS SDK out of the global application shell', () => {
    const appShell = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(appShell).not.toContain('https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js');
  });

  it('loads the payOS SDK automatically only for an eligible checkout without a cached QR', async () => {
    delete (window as typeof window & { PayOSCheckout?: unknown }).PayOSCheckout;
    render(<PaymentCheckout initial={pending} />);

    const script = await waitFor(() => {
      const candidate = document.querySelector<HTMLScriptElement>('script[data-payos-checkout-sdk]');
      expect(candidate).not.toBeNull();
      return candidate!;
    });
    expect(script.src).toBe('https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js');

    (window as typeof window & { PayOSCheckout?: unknown }).PayOSCheckout = {
      usePayOS: vi.fn(() => ({ exit: vi.fn(), open: vi.fn() })),
    };
    script.dispatchEvent(new Event('load'));

    await waitFor(() => expect(payOS()?.usePayOS).toHaveBeenCalledTimes(1));
  });

  it('mounts embedded checkout inline without a redundant payment dialog or navigation', async () => {
    const openWindow = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<PaymentCheckout initial={pending} />);

    await waitFor(() => expect(payOS()?.usePayOS).toHaveBeenCalledTimes(1));
    expect(payOS()?.usePayOS).toHaveBeenCalledWith(expect.objectContaining({
      CHECKOUT_URL: pending.payment?.checkoutUrl,
      ELEMENT_ID: expect.stringMatching(/^payos-checkout-/),
      RETURN_URL: window.location.href,
      embedded: true,
    }));
    expect(openWindow).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Thanh toán$/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Thanh toán PayOS cho đơn EDU-ORDER-1/i)).toBeInTheDocument();
  });

  it('re-fetches canonical state after success without trusting the callback', async () => {
    vi.mocked(paymentService.status).mockResolvedValue(pending);
    render(<PaymentCheckout initial={pending} />);
    await waitFor(() => expect(payOS()?.usePayOS).toHaveBeenCalled());
    const config = payOS()!.usePayOS.mock.calls[0][0];

    await act(async () => {
      config.onSuccess?.({ status: 'PAID' });
      await Promise.resolve();
    });

    expect(paymentService.status).toHaveBeenCalledWith(pending.orderId);
    expect(screen.getByLabelText(/Thanh toán PayOS cho đơn EDU-ORDER-1/i)).toBeInTheDocument();
  });

  it('cleans up the embedded instance without creating another payment request', async () => {
    const exit = vi.fn();
    payOS()!.usePayOS.mockReturnValue({ exit, open: vi.fn() });
    const { unmount } = render(<PaymentCheckout initial={pending} />);

    await waitFor(() => expect(payOS()?.usePayOS).toHaveBeenCalledTimes(1));
    unmount();

    expect(exit).toHaveBeenCalledTimes(1);
    expect(paymentService.create).not.toHaveBeenCalled();
  });

  it('re-fetches canonical state for cancel and exit callbacks', async () => {
    vi.mocked(paymentService.status).mockResolvedValue(pending);
    render(<PaymentCheckout initial={pending} />);
    await waitFor(() => expect(payOS()?.usePayOS).toHaveBeenCalled());
    const config = payOS()!.usePayOS.mock.calls[0][0];

    await act(async () => {
      config.onCancel?.({ status: 'CANCELLED' });
      await Promise.resolve();
    });
    expect(paymentService.status).toHaveBeenCalledTimes(1);

    await act(async () => {
      config.onExit?.({});
      await Promise.resolve();
    });
    expect(paymentService.status).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText(/Thanh toán PayOS cho đơn EDU-ORDER-1/i)).toBeInTheDocument();
  });

  it('unmounts embedded checkout only after the backend confirms PAID', async () => {
    vi.mocked(paymentService.status).mockResolvedValue({
      ...pending,
      orderStatus: 'CONFIRMED',
      payment: { ...pending.payment!, status: 'PAID' },
    });
    render(<PaymentCheckout initial={pending} />);
    await waitFor(() => expect(payOS()?.usePayOS).toHaveBeenCalled());
    const config = payOS()!.usePayOS.mock.calls[0][0];

    await act(async () => {
      config.onSuccess?.({ status: 'PAID' });
      await Promise.resolve();
    });

    expect(paymentService.status).toHaveBeenCalledWith(pending.orderId);
    expect(screen.queryByLabelText(/Thanh toán PayOS cho đơn EDU-ORDER-1/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Thanh toán đã xác nhận/i)).toBeInTheDocument();
  });

  it('shows a safe hosted fallback when the embedded SDK is unavailable', async () => {
    delete (window as typeof window & { PayOSCheckout?: unknown }).PayOSCheckout;
    render(<PaymentCheckout initial={pending} />);

    const script = await waitFor(() => document.querySelector<HTMLScriptElement>('script[data-payos-checkout-sdk]'));
    script?.dispatchEvent(new Event('error'));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mở trang PayOS dự phòng/i })).toHaveAttribute(
      'href',
      pending.payment?.checkoutUrl,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
