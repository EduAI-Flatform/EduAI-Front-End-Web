import { useEffect, useState } from "react";
import {
  paymentService,
  type PaymentProvider,
} from "../../services/payment.service";
import "./bank-transfer-checkout.css";
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
    <label className="payment-method-choice">
      Phương thức thanh toán
<select
        aria-label="Phương thức thanh toán"
        disabled={disabled}
        value={payosEnabled && choice.selected === 'payos' ? 'payos' : ''}
        onChange={(event) => choice.setSelected(payosEnabled && event.target.value === 'payos' ? 'payos' : undefined)}
      >
        <option value="" disabled>{payosEnabled ? 'Chọn phương thức thanh toán' : 'Chưa có phương thức khả dụng'}</option>
        {payosEnabled ? <option value="payos">VietQR · PayOS</option> : null}
        <option value="gds_wallet" disabled>Ví GDS — ví tiền chưa khả dụng</option>
      </select>
      <small>Hãy chọn phương thức trước khi tạo mã QR. Ví GDS nội bộ đang hoàn thiện; điểm TMI không dùng để thanh toán.</small>
    </label>
  );
}
