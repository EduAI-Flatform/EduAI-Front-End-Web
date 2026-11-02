import { useEffect, useState } from "react";
import {
  paymentService,
  type PaymentProvider,
} from "../../services/payment.service";
import './PaymentMethodChoice.css';
export function usePaymentMethodChoice() {
  const [methods, setMethods] = useState<PaymentProvider[]>([]);
  const [selected, setSelected] = useState<PaymentProvider | undefined>();
  useEffect(() => {
    let mounted = true;
    void Promise.resolve()
      .then(() => paymentService.methods())
      .then((next) => {
        if (mounted) {
          // Temporary PAYW-04 checkout policy: show only backend-enabled
          // enterprise PayOS. Preserve VNPay/MB services for existing orders.
          const visible: PaymentProvider[] = next.filter((method) => method === 'payos');
          setMethods(visible);
          // Never silently choose PayOS (or another payable instrument).
          // The learner explicitly selects a method before any QR is created.
          setSelected((current) => current && visible.includes(current) ? current : undefined);
        }
      })
      .catch(() => {
        /* No provider is inferred when the server method list is unavailable. */
      });
    return () => {
      mounted = false;
    };
  }, []);
  return { methods, selected, setSelected };
}
export function PaymentMethodChoice({
  choice,
  disabled = false,
}: {
  choice: ReturnType<typeof usePaymentMethodChoice>;
  disabled?: boolean;
}) {
  const payosEnabled = choice.methods.includes('payos');

  return (
    <fieldset className="payment-method-choice" disabled={disabled}>
      <legend>Phương thức thanh toán</legend>
      <p className="payment-method-choice__help" id="payment-method-choice-help">
        {payosEnabled
          ? 'Chọn phương thức trước khi tạo mã QR.'
          : 'Chưa có phương thức thanh toán khả dụng.'}
      </p>
      {payosEnabled ? (
        <label className={`payment-method-choice__card ${choice.selected === 'payos' ? 'payment-method-choice__card--selected' : ''}`}>
          <input
            aria-describedby="payment-method-choice-help"
            checked={choice.selected === 'payos'}
            name="checkout-payment-method"
            onChange={() => choice.setSelected('payos')}
            type="radio"
            value="payos"
          />
          <span><strong>VietQR · PayOS</strong><small>Quét QR doanh nghiệp trên EduAI</small></span>
        </label>
      ) : null}
      <label className="payment-method-choice__card payment-method-choice__card--unavailable">
        <input disabled name="checkout-payment-method" type="radio" value="gds_wallet" />
        <span><strong>Ví GDS</strong><small>Ví tiền chưa khả dụng</small></span>
      </label>
      <small className="payment-method-choice__footer">Ví GDS đang hoàn thiện; điểm TMI không dùng để thanh toán. VNPay và QR MB tạm ẩn.</small>
    </fieldset>
  );
}
