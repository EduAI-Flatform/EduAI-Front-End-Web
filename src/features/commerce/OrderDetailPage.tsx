import { ArrowLeft, CheckCircle2, Clock3, ReceiptText, ShieldCheck, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  commerceService,
  formatCommerceMoney,
  getCommerceErrorMessage,
  type CommerceOrderHistoryItem,
} from '../../services/commerce.service';
import {
  getPaymentErrorMessage,
  paymentService,
  type PaymentCheckoutState,
} from '../../services/payment.service';
import { PaymentCheckout } from '../payments/PaymentCheckout';
import './orders.css';

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<CommerceOrderHistoryItem | null>(null);
  const [payment, setPayment] = useState<PaymentCheckoutState | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setError(null);
    try {
      const nextOrder = await commerceService.getOrder(orderId);
      setOrder(nextOrder);
      if (nextOrder.payment) {
        try {
          setPayment(await paymentService.status(orderId));
          setPaymentError(null);
        } catch (reason) {
          setPaymentError(getPaymentErrorMessage(reason));
        }
      } else {
        setPayment(null);
      }
    } catch (reason) {
      setError(getCommerceErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createPayment() {
    if (!orderId || !order || order.status !== 'PENDING_PAYMENT' || !order.paymentRequired) return;
    setCreatingPayment(true);
    setPaymentError(null);
    try {
      const created = await paymentService.create(orderId);
      setPayment(created);
      await load();
    } catch (reason) {
      setPaymentError(getPaymentErrorMessage(reason));
    } finally {
      setCreatingPayment(false);
    }
  }

  if (loading) {
    return <div aria-busy="true" className="commerce-orders-state" role="status">Đang tải đơn hàng…</div>;
  }

  if (error || !order) {
    return (
      <section className="commerce-orders-empty container" role="alert">
        <ReceiptText aria-hidden="true" />
        <h1>Không thể mở đơn hàng</h1>
        <p>{error ?? 'Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.'}</p>
        <Link to="/orders">Quay lại đơn hàng</Link>
      </section>
    );
  }

  const effectiveOrderStatus = payment?.orderStatus ?? order.status;
  const confirmed = effectiveOrderStatus === 'CONFIRMED';
  const cancelled = effectiveOrderStatus === 'CANCELLED' || payment?.payment?.status === 'CANCELLED';
  const backendExpired = effectiveOrderStatus === 'EXPIRED' || payment?.payment?.status === 'EXPIRED';
  const paymentWindowExpired = isPaymentWindowExpired(payment);
  const displayExpired = backendExpired || paymentWindowExpired;
  const danger = cancelled || displayExpired;
  const heroStatus = cancelled
    ? 'Đã hủy thanh toán'
    : displayExpired
      ? 'Đã hết hạn thanh toán'
      : statusLabel(effectiveOrderStatus);
  const heroDetail = cancelled
    ? 'Yêu cầu thanh toán đã được hủy'
    : displayExpired
      ? 'Phiên thanh toán đã kết thúc'
      : fulfillmentLabel(order.fulfillmentStatus);

  return (
    <div className="commerce-order-detail-page">
      <div className="container">
        <Link className="commerce-order-back" to="/orders"><ArrowLeft aria-hidden="true" /> Đơn hàng của tôi</Link>

        <header className="commerce-order-detail-hero">
          <div>
            <span className="commerce-eyebrow">Chi tiết đơn hàng</span>
            <h1>{order.orderNumber}</h1>
            <p>Được tạo {formatDate(order.createdAt)}</p>
          </div>
          <div className={`commerce-order-detail-state ${confirmed ? 'is-success' : danger ? 'is-danger' : ''}`}>
            {confirmed ? <CheckCircle2 aria-hidden="true" /> : danger ? <XCircle aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
            <div>
              <strong>{heroStatus}</strong>
              <span>{heroDetail}</span>
            </div>
          </div>
        </header>

        <div className="commerce-order-detail-layout">
          <main className="commerce-order-detail-main">
            <section className="commerce-order-panel">
              <div className="commerce-order-panel__heading">
                <h2>Sản phẩm</h2>
                <span>{order.lines.length} mục</span>
              </div>
              <div className="commerce-order-lines">
                {order.lines.map((line) => (
                  <article className="commerce-order-line" key={line.id}>
                    <div className="commerce-order-line__icon"><ReceiptText aria-hidden="true" /></div>
                    <div>
                      <strong>{line.title}</strong>
                      <span>{line.productType === 'MEMBERSHIP' ? 'Gói thành viên' : 'Khóa học'} · SL {line.quantity}</span>
                    </div>
                    <strong>{formatCommerceMoney(line.finalPrice)}</strong>
                  </article>
                ))}
              </div>
            </section>

            {effectiveOrderStatus === 'PENDING_PAYMENT' && order.paymentRequired && !payment && !order.payment ? (
              <section className="commerce-checkout-start commerce-order-panel">
                <ShieldCheck aria-hidden="true" />
                <div>
                  <h2>Sẵn sàng thanh toán</h2>
                  <p>EduAI sẽ tạo một yêu cầu PayOS cho chính đơn này. Giá trị thanh toán do máy chủ xác nhận.</p>
                </div>
                <button disabled={creatingPayment} onClick={() => void createPayment()} type="button">
                  {creatingPayment ? 'Đang tạo thanh toán…' : `Thanh toán ${formatCommerceMoney(order.payable)}`}
                </button>
              </section>
            ) : null}

            {paymentError ? <p className="commerce-orders-error" role="alert">{paymentError}</p> : null}
            {payment ? <PaymentCheckout initial={payment} onStateChange={setPayment} /> : null}
          </main>

          <aside className="commerce-order-summary-card">
            <h2>Tóm tắt thanh toán</h2>
            <dl>
              <div><dt>Tạm tính</dt><dd>{formatCommerceMoney(order.subtotal)}</dd></div>
              <div><dt>Giảm giá</dt><dd>{formatCommerceMoney(order.discount)}</dd></div>
              <div className="commerce-order-summary-card__total"><dt>Tổng cộng</dt><dd>{formatCommerceMoney(order.payable)}</dd></div>
            </dl>
            <div className="commerce-order-summary-card__trust">
              <ShieldCheck aria-hidden="true" />
              <p>Chỉ trạng thái được backend xác minh mới xác nhận đơn đã thanh toán.</p>
            </div>
            {confirmed ? <Link to="/dashboard">Đi tới khu vực học tập</Link> : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

function isPaymentWindowExpired(payment: PaymentCheckoutState | null): boolean {
  if (!payment?.payment || payment.payment.status !== 'PENDING') return false;
  const expiresAt = new Date(payment.payment.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING_PAYMENT: 'Chờ thanh toán',
    CONFIRMED: 'Đã xác nhận',
    CANCELLED: 'Đã hủy thanh toán',
    EXPIRED: 'Đã hết hạn thanh toán',
    LATE_PAYMENT_REVIEW: 'Đang đối soát',
    LATE_PAYMENT_REFUNDED: 'Đã hoàn tiền',
  };
  return labels[status] ?? 'Đang cập nhật';
}

function fulfillmentLabel(status: string): string {
  const labels: Record<string, string> = {
    NOT_STARTED: 'Chưa cấp quyền lợi',
    PROCESSING: 'Đang cấp quyền lợi',
    FULFILLED: 'Quyền lợi đã hoàn tất',
    FAILED: 'Cần hỗ trợ cấp quyền lợi',
  };
  return labels[status] ?? 'Đang cập nhật quyền lợi';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeStyle: 'short' }).format(date)
    : 'không xác định';
}
