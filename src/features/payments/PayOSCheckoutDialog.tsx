import { ExternalLink, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
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

interface PayOSInlineCheckoutProps {
  checkoutUrl: string;
  onRefresh: () => Promise<CanonicalPaymentState>;
  orderNumber: string;
}

type SdkState = 'loading' | 'ready' | 'error';

const PAYOS_SDK_URL = 'https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js';
let payOSCheckoutSdkPromise: Promise<void> | null = null;

function loadPayOSCheckoutSdk(): Promise<void> {
  if (window.PayOSCheckout) return Promise.resolve();
  if (payOSCheckoutSdkPromise) return payOSCheckoutSdkPromise;

  payOSCheckoutSdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-payos-checkout-sdk]');
    const script = existing ?? document.createElement('script');

    if (!existing) {
      script.async = true;
      script.dataset.payosCheckoutSdk = 'true';
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      script.src = PAYOS_SDK_URL;
      document.head.appendChild(script);
    }

    const handleLoad = () => {
      cleanup();
      if (window.PayOSCheckout) resolve();
      else reject(new Error('payOS SDK did not expose its checkout API.'));
    };
    const handleError = () => {
      cleanup();
      reject(new Error('payOS SDK could not be loaded.'));
    };
    const cleanup = () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
  }).catch((error: unknown) => {
    payOSCheckoutSdkPromise = null;
    document.querySelector('script[data-payos-checkout-sdk]')?.remove();
    throw error;
  });

  return payOSCheckoutSdkPromise;
}

export function PayOSInlineCheckout({
  checkoutUrl,
  onRefresh,
  orderNumber,
}: PayOSInlineCheckoutProps) {
  const reactId = useId();
  const elementId = `payos-checkout-${reactId.replace(/:/g, '')}`;
  const instanceRef = useRef<PayOSCheckoutInstance | null>(null);
  const [sdkState, setSdkState] = useState<SdkState>('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let observer: MutationObserver | null = null;
    let readyTimer = 0;
    let active = true;
    setSdkState('loading');
    setMessage(null);

    const refreshCanonical = async (source: 'success' | 'cancel' | 'exit') => {
      if (!active) return;
      if (source === 'success') setMessage('Đang chờ máy chủ EduAI xác nhận thanh toán…');
      try {
        const next = await onRefresh();
        if (!active) return;
        if (source === 'success' && next.payment?.status === 'PAID') {
          setMessage('Thanh toán đã được máy chủ EduAI xác nhận.');
        } else if (source === 'cancel') {
          setMessage('Đã nhận thao tác từ PayOS; EduAI đang dùng trạng thái máy chủ làm nguồn xác nhận.');
        } else if (source === 'exit') {
          setMessage('PayOS đã đóng. Trạng thái đơn vẫn được EduAI theo dõi tự động.');
        }
      } catch {
        if (active) setMessage('Chưa thể cập nhật trạng thái. EduAI sẽ tiếp tục kiểm tra từ máy chủ.');
      }
    };

    const initialize = async () => {
      try {
        await loadPayOSCheckoutSdk();
      } catch {
        if (active) {
          setSdkState('error');
          setMessage('Không thể tải payOS Embedded Checkout trên trang này.');
        }
        return;
      }
      if (!active) return;

      const sdk = window.PayOSCheckout;
      const container = document.getElementById(elementId);
      if (!sdk || !container) {
        setSdkState('error');
        setMessage('Không thể khởi tạo payOS Embedded Checkout.');
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
        if (active && !container.querySelector('iframe')) {
          setSdkState('error');
          setMessage('PayOS chưa phản hồi kịp. Bạn có thể mở trang PayOS dự phòng bên dưới.');
        }
      }, 10_000);

      try {
        const instance = sdk.usePayOS({
          RETURN_URL: window.location.href,
          ELEMENT_ID: elementId,
          CHECKOUT_URL: checkoutUrl,
          embedded: true,
          onSuccess: () => void refreshCanonical('success'),
          onCancel: () => void refreshCanonical('cancel'),
          onExit: () => void refreshCanonical('exit'),
        });
        instanceRef.current = instance;
        instance.open();
      } catch {
        if (active) {
          setSdkState('error');
          setMessage('Không thể mở payOS Embedded Checkout. Bạn có thể mở trang PayOS dự phòng bên dưới.');
        }
      }
    };

    void initialize();

    return () => {
      active = false;
      window.clearTimeout(readyTimer);
      observer?.disconnect();
      const instance = instanceRef.current;
      instanceRef.current = null;
      if (instance) instance.exit();
      document.getElementById(elementId)?.replaceChildren();
    };
  }, [checkoutUrl, elementId, onRefresh]);

  return (
    <section className="payment-payos-embedded" aria-label={`Thanh toán PayOS cho đơn ${orderNumber}`}>
      <div className="payment-payos-embedded__heading">
        <div>
          <span>Thanh toán trực tiếp</span>
          <strong>Quét VietQR bằng ứng dụng ngân hàng</strong>
        </div>
        <ShieldCheck aria-hidden="true" />
      </div>

      <div className="payment-payos-embedded__viewport">
        {sdkState === 'loading' ? (
          <div className="payment-payos-embedded__state" role="status">
            <LoaderCircle aria-hidden="true" className="payment-payos-embedded__spinner" />
            <strong>Đang tải PayOS…</strong>
            <span>QR thanh toán sẽ xuất hiện ngay trong khung này.</span>
          </div>
        ) : null}

        <div
          className="payment-payos-embedded__mount"
          id={elementId}
        />

        {sdkState === 'error' ? (
          <div className="payment-payos-embedded__state payment-payos-embedded__state--error" role="alert">
            <strong>Không thể nhúng PayOS</strong>
            <span>{message}</span>
            <a href={checkoutUrl} rel="noopener noreferrer" target="_blank">
              <ExternalLink aria-hidden="true" />
              Mở trang PayOS dự phòng
            </a>
          </div>
        ) : null}
      </div>

      {sdkState === 'ready' ? (
        <p className="payment-payos-embedded__ready" role="status">
          <RefreshCw aria-hidden="true" />
          PayOS đã sẵn sàng. EduAI vẫn xác nhận kết quả bằng trạng thái từ backend.
        </p>
      ) : null}
      {message && sdkState === 'ready' ? <p className="payment-payos-embedded__message">{message}</p> : null}
    </section>
  );
}
