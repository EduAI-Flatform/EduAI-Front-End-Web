import { AlertCircle, ArrowLeft, CheckCircle2, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  commerceService,
  formatCommerceMoney,
  getCommerceErrorMessage,
  type CommerceCart,
  type CommerceOrder,
} from '../../services/commerce.service';
import { getPaymentErrorMessage, paymentService, type PaymentCheckoutState } from '../../services/payment.service';
import { PaymentCheckout } from '../payments/PaymentCheckout';
import './cart.css';

export function CartPage() {
  const [cart, setCart] = useState<CommerceCart | null>(null);
  const [order, setOrder] = useState<CommerceOrder | null>(null);
  const [payment, setPayment] = useState<PaymentCheckoutState | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [voucherCodes, setVoucherCodes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void commerceService
      .getCart()
      .then((value) => {
        if (mounted) setCart(value);
      })
      .catch((reason) => {
        if (mounted) setError(getCommerceErrorMessage(reason));
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const voucherApplications = useMemo(
    () =>
      Object.entries(voucherCodes)
        .filter(([, code]) => code.trim())
        .map(([courseId, code]) => ({ courseId, code: code.trim() })),
    [voucherCodes],
  );

  async function mutate(action: string, operation: () => Promise<CommerceCart>) {
    setPendingAction(action);
    setError(null);
    try {
      setCart(await operation());
    } catch (reason) {
      setError(getCommerceErrorMessage(reason));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCheckout() {
    setPendingAction('checkout');
    setError(null);
    setPaymentError(null);
    try {
      const createdOrder = await commerceService.createOrder(voucherApplications);
      setOrder(createdOrder);
      setCart(null);
      try {
        setPayment(await paymentService.create(createdOrder.id));
      } catch (reason) {
        setPaymentError(getPaymentErrorMessage(reason));
      }
    } catch (reason) {
      setError(getCommerceErrorMessage(reason));
      try {
        setCart(await commerceService.getCart());
      } catch {
        // The original actionable checkout error remains visible.
      }
    } finally {
      setPendingAction(null);
    }
  }

  if (isLoading) {
    return <div aria-busy="true" className="commerce-cart-state" role="status">Đang tải giỏ hàng…</div>;
  }

  if (order) return <OrderCreated order={order} payment={payment} paymentError={paymentError} />;

  return (
    <div className="commerce-cart-page">
      <header className="commerce-cart-heading container">
        <div>
          <span>Thanh toán an toàn</span>
          <h1>Giỏ hàng</h1>
          <p>Giá và quyền truy cập được máy chủ kiểm tra lại khi tạo đơn.</p>
        </div>
        <Link to="/courses"><ArrowLeft aria-hidden="true" /> Tiếp tục xem khóa học</Link>
      </header>

      {error ? <p className="commerce-cart-alert container" role="alert"><AlertCircle aria-hidden="true" />{error}</p> : null}

      {!cart || cart.items.length === 0 ? (
        <section className="commerce-cart-empty container" role="status">
          <ShoppingCart aria-hidden="true" />
          <h2>Giỏ hàng đang trống</h2>
          <p>Chọn một khóa học trả phí để bắt đầu.</p>
          <Link to="/courses">Khám phá khóa học</Link>
        </section>
      ) : (
        <div className="commerce-cart-layout container">
          <section aria-labelledby="cart-items-title" className="commerce-cart-items">
            <div className="commerce-cart-section-heading">
              <h2 id="cart-items-title">Khóa học đã chọn</h2>
              <button
                disabled={Boolean(pendingAction)}
                onClick={() => void mutate('clear', () => commerceService.clearCart())}
                type="button"
              >Xóa tất cả</button>
            </div>
            {cart.items.map((item) => (
              <article className="commerce-cart-item" key={item.id}>
                <div className="commerce-cart-item__image">
                  {item.course.thumbnailUrl ? <img alt="" src={item.course.thumbnailUrl} /> : <ShoppingCart aria-hidden="true" />}
                </div>
                <div className="commerce-cart-item__content">
                  <Link to={`/courses/${item.course.id}`}>{item.course.title}</Link>
                  <strong>{formatCommerceMoney(item.unitPrice)}</strong>
                  <p className="commerce-cart-perpetual">
                    Quyền mua riêng là vĩnh viễn và độc lập với quyền truy cập từ gói thành viên.
                  </p>
                  {item.availability !== 'AVAILABLE' ? (
                    <p className="commerce-cart-item__unavailable" role="alert">
                      Cần kiểm tra lại: {availabilityLabel(item.availability)}
                    </p>
                  ) : null}
                  <label>
                    Voucher cho khóa học này
                    <input
                      disabled={Boolean(pendingAction)}
                      id={`cart-voucher-${item.course.id}`}
                      maxLength={64}
                      name={`voucher-${item.course.id}`}
                      onChange={(event) =>
                        setVoucherCodes((current) => ({ ...current, [item.course.id]: event.target.value }))
                      }
                      placeholder="Không bắt buộc"
                      value={voucherCodes[item.course.id] ?? ''}
                    />
                  </label>
                </div>
                <button
                  aria-label={`Xóa ${item.course.title} khỏi giỏ hàng`}
                  className="commerce-cart-item__remove"
                  disabled={Boolean(pendingAction)}
                  onClick={() => void mutate(item.course.id, () => commerceService.removeCourse(item.course.id))}
                  type="button"
                ><Trash2 aria-hidden="true" /></button>
              </article>
            ))}
          </section>

          <aside className="commerce-cart-summary" aria-labelledby="cart-summary-title">
            <h2 id="cart-summary-title">Tóm tắt đơn hàng</h2>
            <dl>
              <div><dt>{cart.summary.itemCount} khóa học</dt><dd>{formatCommerceMoney(cart.summary)}</dd></div>
              <div><dt>Giảm giá</dt><dd>Được tính lại khi tạo đơn</dd></div>
              <div><dt>Tạm tính</dt><dd>{formatCommerceMoney(cart.summary)}</dd></div>
            </dl>
            <p>Không có giá hoặc tổng tiền nào từ trình duyệt được dùng làm căn cứ thanh toán.</p>
            <button
              disabled={!cart.summary.canCheckout || Boolean(pendingAction)}
              onClick={() => void handleCheckout()}
              type="button"
            >{pendingAction === 'checkout' ? 'Đang tạo đơn…' : 'Tạo đơn hàng'}</button>
          </aside>
        </div>
      )}
    </div>
  );
}

function OrderCreated({
  order,
  payment,
  paymentError,
}: {
  order: CommerceOrder;
  payment: PaymentCheckoutState | null;
  paymentError: string | null;
}) {
  return (
    <section className="commerce-order-created container">
      <CheckCircle2 aria-hidden="true" />
      <span>Đơn hàng đã được ghi nhận</span>
      <h1>{order.orderNumber}</h1>
      <p>
        {order.status === 'CONFIRMED'
          ? 'Đơn không cần thanh toán đã được máy chủ xác nhận.'
          : 'Đơn đang chờ thanh toán. Việc quay lại từ trang thanh toán không tự xác nhận đơn.'}
      </p>
      <dl>
        <div><dt>Tạm tính</dt><dd>{formatCommerceMoney(order.subtotal)}</dd></div>
        <div><dt>Giảm giá</dt><dd>{formatCommerceMoney(order.discount)}</dd></div>
        <div><dt>Cần thanh toán</dt><dd>{formatCommerceMoney(order.payable)}</dd></div>
      </dl>
      {paymentError ? <p className="commerce-cart-alert" role="alert">{paymentError}</p> : null}
      {payment ? <PaymentCheckout initial={payment} /> : null}
      <Link to="/courses">Quay lại danh sách khóa học</Link>
    </section>
  );
}

function availabilityLabel(value: CommerceCart['items'][number]['availability']): string {
  const labels = {
    AVAILABLE: 'Sẵn sàng',
    ALREADY_OWNED: 'Bạn đã có quyền truy cập',
    COURSE_UNAVAILABLE: 'Khóa học không còn mở bán',
    PAYMENT_NOT_REQUIRED: 'Khóa học không cần thanh toán',
    UNSUPPORTED_CURRENCY: 'Đơn vị tiền tệ chưa được hỗ trợ',
  };
  return labels[value];
}
