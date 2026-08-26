import { ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatCommerceMoney } from '../../services/commerce.service';
import {
  getPaymentErrorMessage,
  paymentService,
  type PaymentCheckoutState,
} from '../../services/payment.service';

const TERMINAL_STATUSES = new Set(['PAID', 'FAILED', 'CANCELLED', 'EXPIRED']);

export function PaymentCheckout({ initial }: { initial: PaymentCheckoutState }) {
  const [state, setState] = useState(initial);
  const [pollError, setPollError] = useState<string | null>(null);
  const status = state.payment?.status ?? null;

  useEffect(() => {
    if (!state.paymentRequired || !status || TERMINAL_STATUSES.has(status)) return;
    let mounted = true;
    const timer = window.setInterval(() => {
      void paymentService.status(state.orderId)
        .then((next) => {
          if (mounted) {
            setState((current) => ({
              ...next,
              payment: next.payment
                ? {
                    ...next.payment,
                    checkoutUrl: current.payment?.checkoutUrl,
                    qrCodeDataUrl: current.payment?.qrCodeDataUrl,
                  }
                : null,
            }));
            setPollError(null);
          }
        })
        .catch((error) => {
          if (mounted) setPollError(getPaymentErrorMessage(error));
        });
    }, 3000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [state.orderId, state.paymentRequired, status]);

  if (!state.paymentRequired) {
    return (
      <section className="mt-6 rounded-lg border border-emerald-300 bg-emerald-50 p-5 text-emerald-950" role="status">
        <ShieldCheck aria-hidden="true" />
        <h2 className="mt-2 text-lg font-semibold">Không cần thanh toán</h2>
        <p>Máy chủ đã ghi nhận giao dịch nội bộ cho đơn {state.orderNumber}.</p>
      </section>
    );
  }

  const payment = state.payment;
  if (!payment) return null;
  const checkoutUrl = safeHttpsUrl(payment.checkoutUrl);
  const qrCodeDataUrl = safeQrImage(payment.qrCodeDataUrl);

  return (
    <section className="mt-6 rounded-lg border bg-card p-5" aria-labelledby="payment-checkout-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Thanh toán VietQR qua PayOS</p>
          <h2 className="text-xl font-semibold" id="payment-checkout-title">{state.orderNumber}</h2>
        </div>
        <span className="rounded-full border px-3 py-1 text-sm" aria-live="polite">
          {statusLabel(payment.status)}
        </span>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,320px)_1fr]">
        {qrCodeDataUrl ? (
          <img
            alt={`Mã QR thanh toán cho đơn ${state.orderNumber}`}
            className="aspect-square w-full max-w-80 rounded border bg-white p-2"
            src={qrCodeDataUrl}
          />
        ) : (
          <div className="flex aspect-square w-full max-w-80 items-center justify-center rounded border bg-muted p-4 text-center text-sm">
            Mã QR chỉ hiển thị sau khi PayOS tạo yêu cầu thành công.
          </div>
        )}
        <div className="space-y-3">
          <dl className="space-y-2">
            <div><dt className="text-sm text-muted-foreground">Số tiền</dt><dd className="text-xl font-semibold">{formatCommerceMoney(payment.amount)}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Hết hạn</dt><dd>{formatExpiry(payment.expiresAt)}</dd></div>
          </dl>
          {checkoutUrl ? (
            <a className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-primary-foreground" href={checkoutUrl} rel="noreferrer" target="_blank">
              Mở trang PayOS <ExternalLink aria-hidden="true" />
            </a>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Việc quay lại từ PayOS không xác nhận thanh toán. Chỉ webhook đã được máy chủ xác minh mới có thể cập nhật đơn.
          </p>
          {!TERMINAL_STATUSES.has(payment.status) ? (
            <p className="flex items-center gap-2 text-sm" role="status">
              <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
              Đang tự động kiểm tra trạng thái. Không tạo lại đơn hoặc thanh toán lần hai.
            </p>
          ) : null}
          {pollError ? <p className="text-sm text-destructive" role="alert">{pollError}</p> : null}
        </div>
      </div>
    </section>
  );
}

function safeHttpsUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function safeQrImage(value: string | undefined): string | undefined {
  return value?.startsWith('data:image/png;base64,') ? value : undefined;
}

function formatExpiry(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
    : 'Không xác định';
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    CREATED: 'Đang tạo yêu cầu',
    PENDING: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    FAILED: 'Yêu cầu thất bại',
    CANCELLED: 'Đã hủy',
    EXPIRED: 'Đã hết hạn',
    LATE_PAID: 'Cần đối soát',
  };
  return labels[status] ?? 'Đang cập nhật';
}
