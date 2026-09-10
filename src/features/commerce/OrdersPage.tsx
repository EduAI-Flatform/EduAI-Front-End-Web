import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  PackageCheck,
  ReceiptText,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  commerceService,
  formatCommerceMoney,
  getCommerceErrorMessage,
  type CommerceOrderHistoryItem,
} from '../../services/commerce.service';
import './orders.css';

type OrderFilter = 'ALL' | 'PENDING' | 'COMPLETED' | 'CLOSED';

export function OrdersPage() {
  const [orders, setOrders] = useState<CommerceOrderHistoryItem[]>([]);
  const [filter, setFilter] = useState<OrderFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void commerceService.listOrders(1, 100)
      .then((page) => {
        if (mounted) setOrders(page.items);
      })
      .catch((reason) => {
        if (mounted) setError(getCommerceErrorMessage(reason));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const visibleOrders = useMemo(
    () => orders.filter((order) => matchesFilter(order, filter)),
    [filter, orders],
  );
  const pendingCount = orders.filter(isOrderAwaitingPayment).length;

  if (loading) {
    return <div aria-busy="true" className="commerce-orders-state" role="status">Đang tải đơn hàng…</div>;
  }

  return (
    <div className="commerce-orders-page">
      <header className="commerce-orders-hero container">
        <div>
          <span className="commerce-eyebrow">Lịch sử giao dịch</span>
          <h1>Đơn hàng của bạn</h1>
          <p>Theo dõi trạng thái, xem lại nội dung đã mua và tiếp tục các thanh toán còn dang dở.</p>
        </div>
        <div className="commerce-orders-hero__summary" aria-label="Tóm tắt đơn hàng">
          <strong>{orders.length}</strong>
          <span>đơn hàng</span>
          <strong>{pendingCount}</strong>
          <span>chờ thanh toán</span>
        </div>
      </header>

      <div className="commerce-orders-toolbar container" role="tablist" aria-label="Lọc đơn hàng">
        {([
          ['ALL', 'Tất cả'],
          ['PENDING', 'Chờ thanh toán'],
          ['COMPLETED', 'Hoàn tất'],
          ['CLOSED', 'Đã đóng'],
        ] as Array<[OrderFilter, string]>).map(([value, label]) => (
          <button
            aria-selected={filter === value}
            className={filter === value ? 'is-active' : undefined}
            key={value}
            onClick={() => setFilter(value)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="commerce-orders-error container" role="alert">{error}</p> : null}

      {visibleOrders.length === 0 ? (
        <section className="commerce-orders-empty container">
          <ReceiptText aria-hidden="true" />
          <h2>Chưa có đơn hàng phù hợp</h2>
          <p>Các đơn mới và giao dịch đang chờ thanh toán sẽ xuất hiện tại đây.</p>
          <Link to="/courses">Khám phá khóa học</Link>
        </section>
      ) : (
        <section className="commerce-orders-list container" aria-label="Danh sách đơn hàng">
          {visibleOrders.map((order) => <OrderCard key={order.id} order={order} />)}
        </section>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: CommerceOrderHistoryItem }) {
  const paymentWindowExpired = isOrderPaymentWindowExpired(order);
  const status = orderStatusMeta(order.status, paymentWindowExpired);
  const StatusIcon = status.icon;
  const title = order.lines[0]?.title ?? 'Đơn hàng EduAI';
  const extraItems = Math.max(order.lines.length - 1, 0);

  return (
    <article className="commerce-order-card">
      <div className="commerce-order-card__topline">
        <div>
          <span>Mã đơn</span>
          <strong>{order.orderNumber}</strong>
        </div>
        <span className={`commerce-order-status commerce-order-status--${status.tone}`}>
          <StatusIcon aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <div className="commerce-order-card__body">
        <div className="commerce-order-card__product">
          <span className="commerce-order-card__icon"><PackageCheck aria-hidden="true" /></span>
          <div>
            <h2>{title}</h2>
            <p>
              {extraItems > 0 ? `và ${extraItems} sản phẩm khác · ` : ''}
              {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="commerce-order-card__amount">
          <span>Tổng thanh toán</span>
          <strong>{formatCommerceMoney(order.payable)}</strong>
        </div>
      </div>

      <div className="commerce-order-card__footer">
        <p>{orderHint(order, paymentWindowExpired)}</p>
        <Link to={`/orders/${order.id}`}>
          {isOrderAwaitingPayment(order) ? 'Tiếp tục thanh toán' : 'Xem chi tiết'}
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function matchesFilter(order: CommerceOrderHistoryItem, filter: OrderFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'PENDING') return isOrderAwaitingPayment(order);
  if (filter === 'COMPLETED') return order.status === 'CONFIRMED';
  return ['CANCELLED', 'EXPIRED', 'LATE_PAYMENT_REFUNDED'].includes(order.status)
    || isOrderPaymentWindowExpired(order);
}

function isOrderAwaitingPayment(order: CommerceOrderHistoryItem): boolean {
  return order.status === 'PENDING_PAYMENT' && !isOrderPaymentWindowExpired(order);
}

function isOrderPaymentWindowExpired(order: CommerceOrderHistoryItem): boolean {
  if (order.status !== 'PENDING_PAYMENT' || order.payment?.status !== 'PENDING' || !order.payment.expiresAt) return false;
  const expiresAt = new Date(order.payment.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function orderHint(order: CommerceOrderHistoryItem, paymentWindowExpired: boolean): string {
  if (paymentWindowExpired) return 'Đã hết hạn thanh toán. Mã PayOS cũ không còn được sử dụng.';
  if (order.status === 'PENDING_PAYMENT') {
    return order.payment?.status === 'PENDING'
      ? 'PayOS đang chờ bạn hoàn tất thanh toán cho đơn này.'
      : 'Đơn đã tạo nhưng chưa hoàn tất bước thanh toán.';
  }
  if (order.status === 'CONFIRMED' && order.fulfillmentStatus === 'FULFILLED') {
    return 'Thanh toán và quyền truy cập đã được xác nhận.';
  }
  if (order.status === 'CONFIRMED') return 'Đơn đã được xác nhận và đang hoàn tất quyền lợi.';
  if (order.status === 'EXPIRED') return 'Đã hết hạn thanh toán.';
  if (order.status === 'CANCELLED') return 'Thanh toán đã được hủy.';
  return 'Đơn hàng đang được hệ thống cập nhật.';
}

function orderStatusMeta(status: string, paymentWindowExpired = false) {
  if (paymentWindowExpired || status === 'EXPIRED') {
    return { label: 'Đã hết hạn thanh toán', tone: 'danger', icon: Clock3 };
  }
  if (status === 'PENDING_PAYMENT') return { label: 'Chờ thanh toán', tone: 'pending', icon: Clock3 };
  if (status === 'CONFIRMED') return { label: 'Đã xác nhận', tone: 'success', icon: CheckCircle2 };
  if (status === 'CANCELLED') return { label: 'Đã hủy thanh toán', tone: 'danger', icon: XCircle };
  return { label: 'Đang xử lý', tone: 'pending', icon: ReceiptText };
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : 'Không xác định';
}
