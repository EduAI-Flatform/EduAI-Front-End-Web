import { currentSystemLocale } from "../platform/translate-system-message";
import { SystemText, useSystemMessages } from "../platform/SystemText";
import { PaymentMethodChoice, usePaymentMethodChoice } from '../payments/PaymentMethodChoice';
import { ArrowLeft, CheckCircle2, Clock3, ReceiptText, ShieldCheck, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
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
import { gdsWalletService, getGdsCheckoutError } from '../../services/gds-wallet.service';
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import './orders.css';

export function OrderDetailPage() {
  const messageForUi = useSystemMessages();
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const paymentChoice = usePaymentMethodChoice();
  const [order, setOrder] = useState<CommerceOrderHistoryItem | null>(null);
  const [payment, setPayment] = useState<PaymentCheckoutState | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(
    typeof location.state?.gdsPaymentError === 'string' ? location.state.gdsPaymentError : null,
  );

  const load = useCallback(async () => {
    if (!orderId) return;
    setError(null);
    try {
      const nextOrder = await commerceService.getOrder(orderId);
      setOrder(nextOrder);
      if (nextOrder.status === 'CONFIRMED' && nextOrder.fulfillmentStatus === 'FULFILLED') {
        setPayment(null);
        setPaymentError(null);
      } else if (nextOrder.payment) {
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
    if (creatingPayment || cancelling || !orderId || !order || order.status !== 'PENDING_PAYMENT' || !order.paymentRequired) return;
    if (!paymentChoice.selected || !paymentChoice.methods.includes(paymentChoice.selected)) {
      setPaymentError('Hãy chọn phương thức thanh toán trước khi tiếp tục.');
      return;
    }
    setCreatingPayment(true);
    setPaymentError(null);
    try {
      if (paymentChoice.selected === 'gds_wallet') {
        await gdsWalletService.payOrder(orderId);
        setPayment(null);
      } else {
        const created = await paymentService.create(orderId, undefined, paymentChoice.selected);
        setPayment(created);
      }
      await load();
    } catch (reason) {
      setPaymentError(paymentChoice.selected === 'gds_wallet'
        ? getGdsCheckoutError(reason) : getPaymentErrorMessage(reason));
    } finally {
      setCreatingPayment(false);
    }
  }

  async function cancelOrder() {
    if (!orderId || cancelling || creatingPayment || order?.status !== 'PENDING_PAYMENT') return;
    setCancelling(true);
    setPaymentError(null);
    try {
      const next = await paymentService.cancelOrder(orderId);
      if (next.orderId !== orderId) throw new Error('Cancellation identity mismatch');
      setPayment(null);
      await load();
      setCancelOpen(false);
    } catch (reason) {
      setCancelOpen(false);
      setPaymentError(getPaymentErrorMessage(reason));
      await load();
    } finally { setCancelling(false); }
  }

  if (loading) {
    return <div aria-busy="true" className="commerce-orders-state" role="status"><SystemText message={"Đang tải đơn hàng…"} /></div>;
  }

  if (error || !order) {
    return (
      <section className="commerce-orders-empty container" role="alert">
        <ReceiptText aria-hidden="true" />
        <h1><SystemText message={"Không thể mở đơn hàng"} /></h1>
        <p>{error ?? <SystemText message={"Đơn hàng không tồn tại hoặc bạn không có quyền truy cập."} />}</p>
        <Link to="/orders"><SystemText message={"Quay lại đơn hàng"} /></Link>
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
      : payment?.payment?.receiptReviewEnabled && order.fulfillmentStatus !== 'FULFILLED'
        ? 'Quyền học: xem kết quả kiểm tra ảnh bên dưới'
        : fulfillmentLabel(order.fulfillmentStatus);

  return (
    <div className="commerce-order-detail-page">
      <Modal open={cancelOpen} onOpenChange={(open) => { if (!cancelling) setCancelOpen(open); }} title={messageForUi("Hủy đơn hàng?")} description={messageForUi("Chỉ hủy nếu bạn chưa thanh toán. Nếu đã chuyển tiền, hãy giữ đơn để tiếp tục đối soát.")}>
        <div className="commerce-checkout-start__actions">
          <Button variant="outline" disabled={cancelling} onClick={() => setCancelOpen(false)}><SystemText message={"Giữ đơn"} /></Button>
          <Button disabled={cancelling} onClick={() => void cancelOrder()}>{cancelling ? <SystemText message={"Đang hủy…"} /> : <SystemText message={"Xác nhận hủy đơn"} />}</Button>
        </div>
      </Modal>
      <div className="container">
        <Link className="commerce-order-back" to="/orders"><ArrowLeft aria-hidden="true" /> <SystemText message={"Đơn hàng của tôi"} /></Link>

        <header className="commerce-order-detail-hero">
          <div>
            <span className="commerce-eyebrow"><SystemText message={"Chi tiết đơn hàng"} /></span>
            <h1>{order.orderNumber}</h1>
            <p><SystemText message={"Được tạo"} /> {formatDate(order.createdAt)}</p>
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
                <h2><SystemText message={"Sản phẩm"} /></h2>
                <span>{order.lines.length} <SystemText message={"mục"} /></span>
              </div>
              <div className="commerce-order-lines">
                {order.lines.map((line) => (
                  <article className="commerce-order-line" key={line.id}>
                    <div className="commerce-order-line__icon"><ReceiptText aria-hidden="true" /></div>
                    <div>
                      <strong>{line.title}</strong>
                      <span>{line.productType === 'MEMBERSHIP' ? <SystemText message={"Gói thành viên"} /> : <SystemText message={"Khóa học"} />} <SystemText message={"· Số lượng"} /> {line.quantity}</span>
                    </div>
                    <strong>{formatCommerceMoney(line.finalPrice)}</strong>
                  </article>
                ))}
              </div>
            </section>

            {order.membership ? <section className="commerce-order-panel commerce-membership-period" aria-label={messageForUi("Thời hạn gói thành viên")}>
              <h2>{({ PURCHASE: 'Mua gói mới', RENEW: 'Gia hạn gói thành viên', UPGRADE: 'Nâng cấp gói', DOWNGRADE: 'Hạ cấp gói' } as Record<string,string>)[order.membership.action] ?? <SystemText message={"Gói thành viên"} />}</h2>
              <p><SystemText message={"Thời hạn:"} /> <strong>{order.membership.durationMonths} <SystemText message={"tháng"} /></strong></p>
              <p><SystemText message={"Từ"} /> <strong>{formatDate(order.membership.startsAt)}</strong> <SystemText message={"đến"} /> <strong>{formatDate(order.membership.endsAt)}</strong>.</p>
              <p>{confirmed ? <SystemText message={"Thời gian hiệu lực đã ghi nhận."} /> : <SystemText message={"Quyền lợi chỉ được cấp sau khi thanh toán được xác nhận."} />}</p>
            </section> : null}

            {effectiveOrderStatus === 'PENDING_PAYMENT' && order.paymentRequired && !payment && !order.payment ? (
              <section className="commerce-checkout-start commerce-order-panel">
                <div className="commerce-checkout-start__heading">
                  <ShieldCheck aria-hidden="true" />
                  <div><h2><SystemText message={"Thanh toán đơn hàng"} /></h2><p><SystemText message={"Chọn một phương thức và xác nhận thanh toán bên dưới."} /></p></div>
                </div>
                <PaymentMethodChoice choice={paymentChoice} disabled={creatingPayment || cancelling} />
                <div className="commerce-checkout-start__actions">
                  <Button disabled={creatingPayment || cancelling || !paymentChoice.selected} onClick={() => void createPayment()} type="button">
                    {creatingPayment ? <SystemText message={"Đang xử lý…"} /> : !paymentChoice.selected ? <SystemText message={"Chọn phương thức thanh toán"} /> : 'Thanh toán ' + formatCommerceMoney(order.payable)}
                  </Button>
                  <Button variant="outline" disabled={creatingPayment || cancelling} onClick={() => setCancelOpen(true)} type="button"><SystemText message={"Hủy đơn"} /></Button>
                </div>
              </section>
            ) : null}

            {paymentError ? <p className="commerce-orders-error" role="alert"><SystemText message={paymentError} /></p> : null}
            {payment ? <PaymentCheckout initial={payment} onStateChange={setPayment} /> : null}
          </main>

          <aside className="commerce-order-summary-card">
            <h2><SystemText message={"Tóm tắt thanh toán"} /></h2>
            <dl>
              <div><dt><SystemText message={"Tạm tính"} /></dt><dd>{formatCommerceMoney(order.subtotal)}</dd></div>
              <div><dt><SystemText message={"Giảm giá"} /></dt><dd>{formatCommerceMoney(order.discount)}</dd></div>
              <div className="commerce-order-summary-card__total"><dt><SystemText message="Tổng cộng" /></dt><dd>{formatCommerceMoney(order.payable)}</dd></div>
            </dl>
            <div className="commerce-order-summary-card__trust">
              <ShieldCheck aria-hidden="true" />
              <p><SystemText message={"Chỉ trạng thái được hệ thống xác minh mới xác nhận đơn đã thanh toán."} /></p>
            </div>
            {confirmed ? <Link to="/dashboard"><SystemText message={"Đi tới khu vực học tập"} /></Link> : null}
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
    ? new Intl.DateTimeFormat(currentSystemLocale(), { dateStyle: 'long', timeStyle: 'short' }).format(date)
    : 'không xác định';
}
