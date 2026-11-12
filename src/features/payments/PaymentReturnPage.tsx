import { SystemText, useSystemMessages } from "../platform/SystemText";
import { AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  getPaymentErrorMessage,
  paymentService,
  type PaymentCheckoutState,
} from '../../services/payment.service';
import { PaymentCheckout } from './PaymentCheckout';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function PaymentReturnPage() {
  const messageForUi = useSystemMessages();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const isCancelReturn = location.pathname.endsWith('/cancel');
  const [state, setState] = useState<PaymentCheckoutState | null>(null);
  const [error, setError] = useState<string | null>(
    orderId && UUID_V4.test(orderId) ? null : 'Định danh đơn hàng không hợp lệ.',
  );

  useEffect(() => {
    if (!orderId || !UUID_V4.test(orderId)) return;
    let mounted = true;
    void paymentService.status(orderId)
      .then((next) => {
        if (mounted) setState(next);
      })
      .catch((reason) => {
        if (mounted) setError(getPaymentErrorMessage(reason));
      });
    return () => {
      mounted = false;
    };
  }, [orderId]);

  return (
    <section className="container py-10 sm:py-16" aria-labelledby="payment-return-title">
      <div className="mx-auto max-w-3xl rounded-xl border bg-card p-5 sm:p-8">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary"><SystemText message="Thanh toán" /></p>
            <h1 className="mt-1 text-2xl font-semibold" id="payment-return-title">
              {isCancelReturn ? <SystemText message={"Kiểm tra yêu cầu thanh toán"} /> : <SystemText message={"Trạng thái thanh toán"} />}
            </h1>
          </div>
        </div>

        {!state && !error ? <p className="mt-6" role="status"><SystemText message={"Đang kiểm tra trạng thái đơn hàng…"} /></p> : null}
        {error ? (
          <p className="mt-6 flex items-center gap-2 text-destructive" role="alert">
            <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" />
            <SystemText message={error} />
          </p>
        ) : null}
        {state ? <PaymentCheckout initial={state} /> : null}

        <nav className="mt-6 flex flex-wrap gap-3" aria-label={messageForUi("Điều hướng sau thanh toán")}>
          <Link className="inline-flex items-center gap-2 rounded border px-4 py-2" to="/cart">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            <SystemText message={"Giỏ khóa học"} />
          </Link>
          <Link className="inline-flex items-center rounded border px-4 py-2" to="/membership">
            <SystemText message={"Gói thành viên"} />
          </Link>
        </nav>
      </div>
    </section>
  );
}
