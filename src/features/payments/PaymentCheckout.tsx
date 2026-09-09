import {
  CheckCircle2,
  Clock3,
  QrCode,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { formatCommerceMoney } from '../../services/commerce.service';
import {
  getPaymentErrorMessage,
  paymentService,
  type PaymentCheckoutState,
} from '../../services/payment.service';
import { PayOSCheckoutDialog } from './PayOSCheckoutDialog';
import './payment-checkout.css';

const PAYOS_CHECKOUT_HOSTS = new Set(['pay.payos.vn', 'next.pay.payos.vn']);
const TERMINAL_STATUSES = new Set(['PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'LATE_PAID']);

export function PaymentCheckout({ initial }: { initial: PaymentCheckoutState }) {
  const [state, setState] = useState(initial);
  const [pollError, setPollError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const status = state.payment?.status ?? null;

  const applyCanonicalState = useCallback((next: PaymentCheckoutState) => {
    setState((current) => mergeCheckoutPresentation(current, next));
    setPollError(null);
  }, []);

  const refreshCanonicalState = useCallback(async () => {
    const next = await paymentService.status(state.orderId);
    applyCanonicalState(next);
    return next;
  }, [applyCanonicalState, state.orderId]);

  useEffect(() => {
    if (!state.paymentRequired || !status || TERMINAL_STATUSES.has(status)) return;
    let mounted = true;
    const timer = window.setInterval(() => {
      void paymentService.status(state.orderId)
        .then((next) => {
          if (mounted) applyCanonicalState(next);
        })
        .catch((error) => {
          if (mounted) setPollError(getPaymentErrorMessage(error));
        });
    }, 3000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [applyCanonicalState, state.orderId, state.paymentRequired, status]);

  if (!state.paymentRequired) {
    return (
      <section className="payment-checkout-success" role="status">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <span>Không cần thanh toán</span>
          <h2>Đơn {state.orderNumber} đã được xác nhận</h2>
          <p>Máy chủ đã ghi nhận giao dịch nội bộ và tiếp tục cấp quyền lợi.</p>
        </div>
      </section>
    );
  }

  const payment = state.payment;
  if (!payment) return null;
  const checkoutUrl = safeHttpsUrl(payment.checkoutUrl);
  const qrCodeDataUrl = safeQrImage(payment.qrCodeDataUrl);
  const terminal = TERMINAL_STATUSES.has(payment.status);
  const paid = payment.status === 'PAID';

  async function cancelPayment() {
    if (!window.confirm('Bạn có chắc muốn hủy yêu cầu thanh toán này? EduAI sẽ kiểm tra PayOS trước khi đóng đơn.')) return;
    setCancelling(true);
    setPollError(null);
    try {
      setState(await paymentService.cancel(state.orderId));
    } catch (error) {
      setPollError(getPaymentErrorMessage(error));
    } finally {
      setCancelling(false);
    }
  }

  if (paid) {
    return (
      <section className="payment-checkout-success" role="status">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <span>Thanh toán đã xác nhận</span>
          <h2>{state.orderNumber}</h2>
          <p>Backend đã xác minh thanh toán {formatCommerceMoney(payment.amount)}. Không cần thanh toán thêm lần nữa.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="payment-checkout-card" aria-labelledby="payment-checkout-title">
      <header className="payment-checkout-card__header">
        <div>
          <span className="payment-checkout-card__eyebrow">VietQR · PayOS</span>
          <h2 id="payment-checkout-title">{state.orderNumber}</h2>
          <p>Quét QR hoặc mở cửa sổ PayOS ngay trong EduAI.</p>
        </div>
        <span className={`payment-checkout-status payment-checkout-status--${statusTone(payment.status)}`} aria-live="polite">
          {payment.status === 'PENDING' ? <Clock3 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
          {statusLabel(payment.status)}
        </span>
      </header>

      <div className="payment-checkout-card__body">
        <div className="payment-checkout-qr-column">
          <div className="payment-checkout-qr-shell">
            {!terminal && qrCodeDataUrl ? (
              <img
                alt={`Mã QR thanh toán cho đơn ${state.orderNumber}`}
                src={qrCodeDataUrl}
              />
            ) : (
              <div className="payment-checkout-qr-placeholder">
                <QrCode aria-hidden="true" />
                <strong>{terminal ? 'Thanh toán đã đóng' : 'Mở PayOS để thanh toán'}</strong>
                <span>{terminal ? 'QR không còn khả dụng cho trạng thái này.' : 'Nếu QR chưa hiện, bạn vẫn có thể mở PayOS bên cạnh.'}</span>
              </div>
            )}
          </div>
          <p className="payment-checkout-qr-note">QR được lưu tạm trên thiết bị đến khi hết hạn; trạng thái thanh toán luôn lấy từ máy chủ.</p>
        </div>

        <div className="payment-checkout-info">
          <div className="payment-checkout-amount">
            <span>Số tiền cần thanh toán</span>
            <strong>{formatCommerceMoney(payment.amount)}</strong>
          </div>
          <dl>
            <div><dt>Trạng thái</dt><dd>{statusLabel(payment.status)}</dd></div>
            <div><dt>Hết hạn</dt><dd>{formatExpiry(payment.expiresAt)}</dd></div>
            <div><dt>Cổng thanh toán</dt><dd>PayOS</dd></div>
          </dl>

          {!terminal && checkoutUrl ? (
            <PayOSCheckoutDialog
              amountLabel={formatCommerceMoney(payment.amount)}
              checkoutUrl={checkoutUrl}
              onRefresh={refreshCanonicalState}
              orderNumber={state.orderNumber}
            />
          ) : null}

          {payment.status === 'PENDING' ? (
            <button
              aria-label="Cancel payment request"
              className="payment-checkout-cancel"
              disabled={cancelling}
              onClick={() => void cancelPayment()}
              type="button"
            >
              <XCircle aria-hidden="true" />
              {cancelling ? 'Đang xác minh với PayOS…' : 'Hủy yêu cầu thanh toán'}
            </button>
          ) : null}

          <div className="payment-checkout-security-note">
            <ShieldCheck aria-hidden="true" />
            <p>Trang PayOS hoặc QR không tự xác nhận thành công. Chỉ webhook và trạng thái backend đã xác minh mới cập nhật đơn.</p>
          </div>

          {!terminal ? (
            <p className="payment-checkout-polling" role="status">
              <RefreshCw aria-hidden="true" />
              Đang tự động kiểm tra trạng thái mỗi vài giây. Không tạo lại đơn hoặc thanh toán lần hai.
            </p>
          ) : null}
          {pollError ? <p className="payment-checkout-error" role="alert">{pollError}</p> : null}
        </div>
      </div>
    </section>
  );
}

function mergeCheckoutPresentation(
  current: PaymentCheckoutState,
  next: PaymentCheckoutState,
): PaymentCheckoutState {
  if (!next.payment || TERMINAL_STATUSES.has(next.payment.status)) return next;
  return {
    ...next,
    payment: {
      ...next.payment,
      checkoutUrl: next.payment.checkoutUrl ?? current.payment?.checkoutUrl,
      qrCodeDataUrl: next.payment.qrCodeDataUrl ?? current.payment?.qrCodeDataUrl,
    },
  };
}

function safeHttpsUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:'
      && parsed.port.length === 0
      && parsed.username.length === 0
      && parsed.password.length === 0
      && PAYOS_CHECKOUT_HOSTS.has(parsed.hostname.toLowerCase())
      ? parsed.toString()
      : undefined;
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

function statusTone(status: string): string {
  if (status === 'PENDING' || status === 'CREATED') return 'pending';
  if (status === 'PAID') return 'success';
  return 'muted';
}
