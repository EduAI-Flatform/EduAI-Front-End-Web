import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Clock3,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  commerceService,
  formatCommerceMoney,
  getCommerceErrorMessage,
  type CommerceCart,
} from '../../services/commerce.service';
import {
  getPaymentErrorMessage,
  paymentService,
  type PaymentCheckoutState,
} from '../../services/payment.service';
import './cart.css';

export function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CommerceCart | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PaymentCheckoutState[]>([]);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [voucherCodes, setVoucherCodes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void Promise.allSettled([commerceService.getCart(), paymentService.pending()])
      .then(([cartResult, paymentsResult]) => {
        if (!mounted) return;
        if (cartResult.status === 'fulfilled') setCart(cartResult.value);
        else setError(getCommerceErrorMessage(cartResult.reason));
        if (paymentsResult.status === 'fulfilled') setPendingPayments(paymentsResult.value.items);
        else setPaymentError(getPaymentErrorMessage(paymentsResult.reason));
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
      setCart(null);
      try {
        await paymentService.create(createdOrder.id);
      } catch {
        // The order detail view safely resumes this exact server-created order.
      }
      navigate(`/orders/${createdOrder.id}`);
    } catch (reason) {
      setError(getCommerceErrorMessage(reason));
      try {
        setCart(await commerceService.getCart());
      } catch {
        // Keep the original actionable checkout error visible.
      }
    } finally {
      setPendingAction(null);
    }
  }

  if (isLoading) {
    return <div aria-busy="true" className="commerce-cart-state" role="status">Đang tải giỏ hàng…</div>;
  }

  return (
    <div className="commerce-cart-page">
      <header className="commerce-cart-heading container">
        <div>
          <span>Giỏ hàng EduAI</span>
          <h1>Sẵn sàng cho bước tiếp theo</h1>
          <p>Kiểm tra khóa học, ưu đãi và tổng tiền trước khi tạo đơn.</p>
        </div>
        <Link to="/courses"><ArrowLeft aria-hidden="true" /> Tiếp tục xem khóa học</Link>
      </header>

      <PendingPaymentNotice payments={pendingPayments} paymentError={paymentError} />

      {error ? <p className="commerce-cart-alert container" role="alert"><AlertCircle aria-hidden="true" />{error}</p> : null}

      {!cart || cart.items.length === 0 ? (
        <section className="commerce-cart-empty container" role="status">
          <span className="commerce-cart-empty__icon"><ShoppingCart aria-hidden="true" /></span>
          <h2>Giỏ hàng đang trống</h2>
          <p>Bạn có thể tiếp tục khám phá khóa học hoặc xem lại các đơn hàng đã tạo.</p>
          <div className="commerce-cart-empty__actions">
            <Link to="/courses">Khám phá khóa học</Link>
            <Link className="is-secondary" to="/orders">Xem đơn hàng</Link>
          </div>
        </section>
      ) : (
        <div className="commerce-cart-layout container">
          <section aria-labelledby="cart-items-title" className="commerce-cart-items">
            <div className="commerce-cart-section-heading">
              <div>
                <h2 id="cart-items-title">Khóa học đã chọn</h2>
                <span>{cart.summary.itemCount} sản phẩm</span>
              </div>
              <button
                disabled={Boolean(pendingAction)}
                onClick={() => void mutate('clear', () => commerceService.clearCart())}
                type="button"
              >Xóa tất cả</button>
            </div>

            {cart.items.map((item) => (
              <article className="commerce-cart-item" key={item.id}>
                <div className="commerce-cart-item__image">
                  {item.course.thumbnailUrl
                    ? <img alt="" src={item.course.thumbnailUrl} />
                    : <ShoppingCart aria-hidden="true" />}
                </div>
                <div className="commerce-cart-item__content">
                  <div className="commerce-cart-item__title-row">
                    <Link to={`/courses/${item.course.id}`}>{item.course.title}</Link>
                    <strong>{formatCommerceMoney(item.unitPrice)}</strong>
                  </div>
                  <p className="commerce-cart-perpetual">Quyền truy cập mua riêng được giữ độc lập với gói thành viên.</p>
                  {item.availability !== 'AVAILABLE' ? (
                    <p className="commerce-cart-item__unavailable" role="alert">
                      Cần kiểm tra lại: {availabilityLabel(item.availability)}
                    </p>
                  ) : null}
                  <label>
                    <span>Voucher</span>
                    <input
                      disabled={Boolean(pendingAction)}
                      id={`cart-voucher-${item.course.id}`}
                      maxLength={64}
                      name={`voucher-${item.course.id}`}
                      onChange={(event) => setVoucherCodes((current) => ({
                        ...current,
                        [item.course.id]: event.target.value,
                      }))}
                      placeholder="Nhập mã ưu đãi (nếu có)"
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
            <div className="commerce-cart-summary__heading">
              <ReceiptText aria-hidden="true" />
              <div>
                <span>Đơn hàng của bạn</span>
                <h2 id="cart-summary-title">Tóm tắt thanh toán</h2>
              </div>
            </div>
            <dl>
              <div><dt>Tạm tính ({cart.summary.itemCount})</dt><dd>{formatCommerceMoney(cart.summary)}</dd></div>
              <div><dt>Ưu đãi</dt><dd>Tính khi tạo đơn</dd></div>
              <div className="commerce-cart-summary__total"><dt>Tổng dự kiến</dt><dd>{formatCommerceMoney(cart.summary)}</dd></div>
            </dl>
            <div className="commerce-cart-summary__trust">
              <ShieldCheck aria-hidden="true" />
              <p>Giá, voucher và quyền sở hữu được backend kiểm tra lại trước khi phát sinh thanh toán.</p>
            </div>
            <button
              disabled={!cart.summary.canCheckout || Boolean(pendingAction)}
              onClick={() => void handleCheckout()}
              type="button"
            >
              {pendingAction === 'checkout' ? 'Đang tạo đơn…' : 'Tiếp tục thanh toán'}
              {pendingAction !== 'checkout' ? <ArrowRight aria-hidden="true" /> : null}
            </button>
            <p className="commerce-cart-summary__fineprint">Bạn sẽ xem lại đơn và mã QR PayOS ở bước tiếp theo.</p>
          </aside>
        </div>
      )}
    </div>
  );
}

function PendingPaymentNotice({
  payments,
  paymentError,
}: {
  payments: PaymentCheckoutState[];
  paymentError: string | null;
}) {
  if (payments.length === 0 && paymentError === null) return null;
  const first = payments[0];
  return (
    <section className="commerce-cart-pending container" aria-labelledby="pending-payments-title">
      <div className="commerce-cart-pending__icon"><Clock3 aria-hidden="true" /></div>
      <div className="commerce-cart-pending__content">
        <h2 id="pending-payments-title">
          {payments.length > 0
            ? `Bạn có ${payments.length} đơn đang chờ thanh toán`
            : 'Đang kiểm tra các thanh toán trước đó'}
        </h2>
        <p>
          {first
            ? `${first.orderNumber} · ${first.payment ? formatCommerceMoney(first.payment.amount) : 'Đang cập nhật số tiền'}. Hoàn tất đơn cũ mà không cần tạo lại thanh toán.`
            : paymentError}
        </p>
      </div>
      <div className="commerce-cart-pending__actions">
        {first ? <Link to={`/orders/${first.orderId}`}>Mở đơn này <ArrowRight aria-hidden="true" /></Link> : null}
        <Link className="is-secondary" to="/orders">Tất cả đơn hàng</Link>
      </div>
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
