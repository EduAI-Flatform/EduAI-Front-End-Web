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
          setSelected(next[0]);
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
  if (choice.methods.length === 0) return null;
  return (
    <label className="payment-method-choice">
      Phương thức thanh toán
      <select
        disabled={disabled}
        value={choice.selected ?? ""}
        onChange={(event) =>
          choice.setSelected(event.target.value as PaymentProvider)
        }
      >
        {choice.methods.map((method) => (
          <option key={method} value={method}>
            {method === "bank_transfer"
              ? "Chuyển khoản ngân hàng bằng mã QR"
              : method === "payos"
                ? "VietQR · PayOS"
                : "VNPay"}
          </option>
        ))}
      </select>
    </label>
  );
}
