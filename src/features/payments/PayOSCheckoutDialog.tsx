import * as Dialog from '@radix-ui/react-dialog';
import { CreditCard, LoaderCircle, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

interface CanonicalPaymentState {
  payment: { status: string } | null;
}

interface PayOSCheckoutConfig {
  RETURN_URL: string;
  ELEMENT_ID: string;
  CHECKOUT_URL: string;
  embedded: true;
  onSuccess: (event: unknown) => void;
  onCancel: (event: unknown) => void;
  onExit: (event: unknown) => void;
}

interface PayOSCheckoutInstance {
  open(): void;
  exit(): void;
}

declare global {
  interface Window {
    PayOSCheckout?: {
      usePayOS(config: PayOSCheckoutConfig): PayOSCheckoutInstance;
    };
  }
}

interface PayOSCheckoutDialogProps {
  amountLabel: string;
  checkoutUrl: string;
  onRefresh: () => Promise<CanonicalPaymentState>;
  orderNumber: string;
}

type SdkState = 'idle' | 'loading' | 'ready' | 'error';

const PAYOS_SDK_URL = 'https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js';
let payOSCheckoutSdkPromise: Promise<void> | null = null;

function loadPayOSCheckoutSdk(): Promise<void> {
  if (window.PayOSCheckout) return Promise.resolve();
  if (payOSCheckoutSdkPromise) return payOSCheckoutSdkPromise;

  payOSCheckoutSdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.dataset.payosCheckoutSdk = 'true';
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    script.src = PAYOS_SDK_URL;
    script.addEventListener(
      'load',
      () => {
        if (window.PayOSCheckout) resolve();
        else reject(new Error('payOS SDK did not expose its checkout API.'));
      },
      { once: true },
    );
    script.addEventListener(
      'error',
      () => {
        reject(new Error('payOS SDK could not be loaded.'));
      },
      { once: true },
    );
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    payOSCheckoutSdkPromise = null;
    document.querySelector('script[data-payos-checkout-sdk]')?.remove();
    throw error;
  });

  return payOSCheckoutSdkPromise;
}

export function PayOSCheckoutDialog({
  amountLabel,
  checkoutUrl,
  onRefresh,
  orderNumber,
}: PayOSCheckoutDialogProps) {
  const reactId = useId();
  const elementId = `payos-checkout-${reactId.replace(/:/g, '')}`;
  const instanceRef = useRef<PayOSCheckoutInstance | null>(null);
  const [open, setOpen] = useState(false);
  const [sdkState, setSdkState] = useState<SdkState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let observer: MutationObserver | null = null;
    let readyTimer = 0;
    let active = true;
    setSdkState('loading');
    setMessage(null);

    const refreshCanonical = async (source: 'success' | 'cancel' | 'exit') => {
      if (source === 'success') {
        setMessage('Đang xác nhận thanh toán');
      }
      try {
        const next = await onRefresh();
        if (source === 'success' && next.payment?.status === 'PAID') {
          setMessage('Thanh toán đã được máy chủ xác nhận');
          setOpen(false);
          return;
        }
        if (source === 'success') {
          setMessage('Đang xác nhận thanh toán');
        } else if (source === 'cancel') {
          setMessage('EduAI đã cập nhật trạng thái thanh toán từ máy chủ');
        }
      } catch {
        setMessage('Chưa thể cập nhật trạng thái. EduAI sẽ tiếp tục kiểm tra từ máy chủ.');
      }
    };

    const initializeTimer = window.setTimeout(async () => {
      try {
        await loadPayOSCheckoutSdk();
      } catch {
        if (active) {
          setSdkState('error');
          setMessage('Không thể tải payOS Embedded Checkout. Vui lòng thử lại.');
        }
        return;
      }
      if (!active) return;

      const sdk = window.PayOSCheckout;
      const container = document.getElementById(elementId);
      if (!sdk || !container) {
        setSdkState('error');
        setMessage('Không thể tải payOS Embedded Checkout. Vui lòng thử lại.');
        return;
      }

      observer = new MutationObserver(() => {
        if (container.querySelector('iframe')) {
          setSdkState('ready');
          window.clearTimeout(readyTimer);
        }
      });
      observer.observe(container, { childList: true, subtree: true });
      readyTimer = window.setTimeout(() => {
        if (!container.querySelector('iframe')) {
          setSdkState('error');
          setMessage('payOS chưa phản hồi. Vui lòng đóng và thử lại.');
        }
      }, 10_000);

      try {
        const instance = sdk.usePayOS({
          RETURN_URL: window.location.href,
          ELEMENT_ID: elementId,
          CHECKOUT_URL: checkoutUrl,
          embedded: true,
          onSuccess: () => {
            void refreshCanonical('success');
          },
          onCancel: () => {
            void refreshCanonical('cancel');
          },
          onExit: () => {
            if (!active) return;
            void refreshCanonical('exit');
            setOpen(false);
          },
        });
        instanceRef.current = instance;
        instance.open();
      } catch {
        setSdkState('error');
        setMessage('Không thể mở payOS Embedded Checkout. Vui lòng thử lại.');
      }
    }, 0);

    return () => {
      window.clearTimeout(initializeTimer);
      window.clearTimeout(readyTimer);
      observer?.disconnect();
      active = false;
      const instance = instanceRef.current;
      instanceRef.current = null;
      if (instance) {
        instance.exit();
      }
      document.getElementById(elementId)?.replaceChildren();
    };
  }, [checkoutUrl, elementId, onRefresh, open]);

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger asChild>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-primary px-4 py-2 font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
          type="button"
        >
          <CreditCard aria-hidden="true" className="h-5 w-5" />
          Thanh toán
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-2 bottom-2 top-2 z-50 flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-card text-card-foreground shadow-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-semibold text-foreground">
                Thanh toán đơn hàng
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{orderNumber}</span>
                <span aria-hidden="true"> · </span>
                {amountLabel}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Đóng thanh toán"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-4">
            <div className="relative min-h-[30rem] overflow-hidden rounded-[var(--radius-card)] border border-border bg-white">
              {sdkState === 'loading' ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white p-6 text-center text-slate-700" role="status">
                  <span className="flex items-center gap-2">
                    <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
                    Đang tải payOS Embedded Checkout
                  </span>
                </div>
              ) : null}
              <div
                className="min-h-[30rem] w-full overflow-x-hidden [&>iframe]:min-h-[30rem] [&>iframe]:w-full [&>iframe]:border-0"
                id={elementId}
              />
              {sdkState === 'error' ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white p-6 text-center text-sm text-red-700" role="alert">
                  {message}
                </div>
              ) : null}
            </div>
            {message && sdkState !== 'error' ? (
              <p className="mt-3 text-sm text-muted-foreground" role="status">{message}</p>
            ) : null}
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-border px-4 py-3 sm:px-6">
            <p className="text-xs text-muted-foreground">
              Trạng thái thanh toán chỉ được xác nhận từ máy chủ EduAI.
            </p>
            <Dialog.Close asChild>
              <button className="shrink-0 rounded border border-border px-4 py-2 text-sm font-semibold hover:bg-muted" type="button">
                Đóng
              </button>
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
