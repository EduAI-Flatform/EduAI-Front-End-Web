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
          setMethods(next);
          // Never silently choose PayOS (or another payable instrument).
          // The learner explicitly selects a method before any QR is created.
          setSelected((current) => current && next.includes(current) ? current : undefined);
        }
      })
      .catch(() => {
        /* Legacy provider selection stays server-controlled; bank transfer is never inferred. */
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

  return (
    <label className="payment-method-choice">
      Phương thức thanh toán
<select
        aria-label="Phương thức thanh toán"
        disabled={disabled}
        value={choice.selected ?? ""}
        onChange={(event) =>
          choice.setSelected(event.target.value as PaymentProvider)
        }
      >
        <option value="" disabled>{choice.methods.length === 0 ? 'Chưa có phương thức khả dụng' : 'Chọn phương thức thanh toán'}</option>
        {choice.methods.map((method) => (
          <option key={method} value={method}>
            {method === "bank_transfer"
              ? "Quét QR — chuyển khoản MB"
              : method === "payos"
                ? "VietQR · PayOS"
                : "VNPay"}
          </option>
        ))}
        {!choice.methods.includes('bank_transfer') ? <option value="bank_unavailable" disabled>Quét QR MB — chưa khả dụng</option> : null}
        <option value="gds_wallet" disabled>Ví GDS — ví tiền chưa khả dụng</option>
      </select>
      <small>Hãy chọn phương thức trước khi tạo mã QR. Ví GDS nội bộ đang hoàn thiện; điểm TMI không dùng để thanh toán.</small>
    </label>
  );
}
