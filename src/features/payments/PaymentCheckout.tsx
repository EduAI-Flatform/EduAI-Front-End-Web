import {
  CheckCircle2,
  Clock3,
  QrCode,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { formatCommerceMoney } from '../../services/commerce.service';
import {
  getPaymentErrorMessage,
  paymentService,
  type PaymentCheckoutState,
} from '../../services/payment.service';
import { PayOSInlineCheckout } from './PayOSCheckoutDialog';
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
  const providerWindowExpired = !terminal && isPastExpiry(payment.expiresAt);
  const canUseProviderCheckout = !terminal && !providerWindowExpired && Boolean(checkoutUrl);

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
          <p>Thanh toán ngay trong EduAI; không cần tạo thêm yêu cầu mới.</p>
        </div>
        <span className={`payment-checkout-status payment-checkout-status--${providerWindowExpired ? 'warning' : statusTone(payment.status)}`} aria-live="polite">
          {providerWindowExpired || payment.status === 'PENDING' ? <Clock3 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
          {providerWindowExpired ? 'Hết thời gian thanh toán' : statusLabel(payment.status)}
        </span>
      </header>

      <div className="payment-checkout-card__body">
        <div className="payment-checkout-provider-column">
          {providerWindowExpired ? (
            <section className="payment-checkout-expired" role="status">
              <TriangleAlert aria-hidden="true" />
              <div>
                <strong>Liên kết PayOS đã hết hạn</strong>
                <p>Không mở lại hoặc thanh toán từ liên kết cũ. EduAI vẫn giữ nguyên đơn và tiếp tục lấy trạng thái thật từ backend.</p>
              </div>
            </section>
          ) : qrCodeDataUrl ? (
            <section className="payment-checkout-direct-qr" aria-label="Mã VietQR thanh toán">
              <div className="payment-checkout-direct-qr__heading">
                <div>
                  <span>Thanh toán trực tiếp</span>
                  <strong>Quét QR bằng ứng dụng ngân hàng</strong>
                </div>
                <QrCode aria-hidden="true" />
              </div>
              <div className="payment-checkout-qr-shell">
                <img
                  alt={`Mã QR thanh toán cho đơn ${state.orderNumber}`}
                  src={qrCodeDataUrl}
                />
              </div>
              <p>QR này chỉ là phương tiện thanh toán; trạng thái thành công vẫn phải được backend xác nhận.</p>
            </section>
          ) : canUseProviderCheckout && checkoutUrl ? (
            <PayOSInlineCheckout
              checkoutUrl={checkoutUrl}
              onRefresh={refreshCanonicalState}
              orderNumber={state.orderNumber}
            />
          ) : (
            <section className="payment-checkout-expired payment-checkout-expired--neutral" role="status">
              <QrCode aria-hidden="true" />
              <div>
                <strong>Chưa có QR khả dụng</strong>
                <p>EduAI chưa nhận được dữ liệu QR hoặc liên kết PayOS hợp lệ cho yêu cầu này.</p>
              </div>
            </section>
          )}
        </div>

        <div className="payment-checkout-info">
          <div className="payment-checkout-amount">
            <span>Số tiền cần thanh toán</span>
            <strong>{formatCommerceMoney(payment.amount)}</strong>
          </div>
          <dl>
            <div><dt>Trạng thái máy chủ</dt><dd>{statusLabel(payment.status)}</dd></div>
            <div><dt>Hết hạn PayOS</dt><dd>{formatExpiry(payment.expiresAt)}</dd></div>
            <div><dt>Cổng thanh toán</dt><dd>PayOS</dd></div>
          </dl>

          <div className="payment-checkout-security-note">
            <ShieldCheck aria-hidden="true" />
            <p>QR, iframe hay trang PayOS không tự xác nhận thành công. Chỉ webhook và trạng thái backend đã xác minh mới cập nhật đơn.</p>
          </div>

          {!terminal ? (
            <p className="payment-checkout-polling" role="status">
              <RefreshCw aria-hidden="true" />
              Đang tự động kiểm tra trạng thái mỗi vài giây. Không tạo lại đơn hoặc thanh toán lần hai.
            </p>
          ) : null}

          {payment.status === 'PENDING' ? (
            <div className="payment-checkout-order-actions">
              <div>
                <strong>Tùy chọn đơn hàng</strong>
                <span>Chỉ hủy khi bạn chắc chắn không tiếp tục thanh toán yêu cầu này.</span>
              </div>
              <button
                aria-label="Hủy yêu cầu thanh toán"
                className="payment-checkout-cancel"
                disabled={cancelling}
                onClick={() => void cancelPayment()}
                type="button"
              >
                <XCircle aria-hidden="true" />
                {cancelling ? 'Đang xác minh với PayOS…' : 'Hủy yêu cầu thanh toán'}
              </button>
            </div>
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

function isPastExpiry(value: string): boolean {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now();
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
