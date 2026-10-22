import { Copy, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getPaymentErrorMessage,
  paymentService,
  type PaymentCheckoutState,
} from "../../services/payment.service";
import "./bank-transfer-checkout.css";

type Props = {
  state: PaymentCheckoutState;
  onRefresh: () => Promise<unknown>;
  onCancel: () => Promise<void>;
  cancelling: boolean;
  onStateChange: (state: PaymentCheckoutState) => void;
};
const labels: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  CREATED: "Đang tạo yêu cầu",
  UNDER_REVIEW: "Đang đối soát",
  NEEDS_SUPPORT: "Cần hỗ trợ",
  PAID: "Đã thanh toán",
  EXPIRED: "Đã hết hạn",
  CANCELLED: "Đã hủy",
  FAILED: "Yêu cầu thất bại",
  LATE_PAID: "Đang đối soát",
};

export function BankTransferCheckout({
  state,
  onRefresh,
  onCancel,
  cancelling,
  onStateChange,
}: Props) {
  const [now, setNow] = useState(Date.now());
  const [feedback, setFeedback] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const payment = state.payment;
  if (!payment) return null;
  const details = payment.bankTransfer;
  const expiry = new Date(payment.expiresAt).getTime();
  const amount =
    payment.amount.currency === "VND" &&
    /^[1-9][0-9]*$/.test(payment.amount.amountMinor)
      ? payment.amount.amountMinor
      : null;
  const valid = Boolean(
    details &&
      Object.values(details).every(
        (value) => typeof value === "string" && value.trim(),
      ) &&
      amount &&
      Number.isFinite(expiry),
  );
  const expired =
    payment.status === "PENDING" && (!Number.isFinite(expiry) || expiry <= now);
  const status = expired ? "EXPIRED" : payment.status;
  const active = valid && status === "PENDING";
  const qr =
    active && payment.qrCodeDataUrl?.startsWith("data:image/png;base64,")
      ? payment.qrCodeDataUrl
      : undefined;
  const formattedAmount = amount
    ? new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(BigInt(amount))
    : "Không khả dụng";
  const rows =
    details && amount
      ? [
          ["Ngân hàng", details.bankName],
          ["Tài khoản nhận", details.accountNumber],
          ["Người thụ hưởng", details.beneficiaryName],
          ["Số tiền", formattedAmount],
          ["Nội dung chuyển khoản", details.transferContent],
        ]
      : [];
  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback("Đã sao chép " + label.toLowerCase());
    } catch {
      setFeedback(
        "Không thể sao chép. Vui lòng chọn thông tin và sao chép thủ công.",
      );
    }
  }
  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      await onRefresh();
    } catch (err) {
      setError(getPaymentErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function support() {
    if (reason.trim().length < 8 || reason.trim().length > 300 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await paymentService.requestBankTransferSupport(
        state.orderId,
        reason.trim(),
      );
      onStateChange(next);
      setFeedback("Đã gửi yêu cầu tra soát. Chưa xác nhận thanh toán.");
    } catch (err) {
      setError(getPaymentErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="bank-transfer-checkout"
      aria-labelledby="bank-transfer-title"
    >
      <header>
        <div>
          <span className="bank-transfer-eyebrow">
            VietQR · Đối soát thủ công
          </span>
          <h2 id="bank-transfer-title">Chuyển khoản ngân hàng bằng mã QR</h2>
          <p>Đơn {state.orderNumber}</p>
        </div>
        <strong className="bank-transfer-status" role="status">
          {labels[status] ?? "Cần kiểm tra trạng thái"}
        </strong>
      </header>
      {/SANDBOX|THU NGHIEM|DEMO/i.test(details?.beneficiaryName ?? "") ? (
        <p className="bank-transfer-notice" role="note">
          Chế độ thử nghiệm — không chuyển tiền thật.
        </p>
      ) : null}
      {status === "PAID" ? (
        <p role="status">
          Máy chủ đã xác nhận thanh toán. Không chuyển thêm tiền.
        </p>
      ) : (
        <>
          {!valid ? (
            <p role="alert">
              Thông tin chuyển khoản chưa khả dụng. Không chuyển tiền; hãy kiểm
              tra trạng thái hoặc yêu cầu hỗ trợ.
            </p>
          ) : null}
          {!active ? (
            <p className="bank-transfer-notice">
              Yêu cầu này không còn nhận chuyển khoản. Nếu bạn đã chuyển, không
              chuyển thêm tiền; hãy gửi yêu cầu tra soát bên dưới. Chỉ sao kê
              ngân hàng được kiểm tra hợp lệ mới xác nhận thanh toán.
            </p>
          ) : null}
          {valid ? (
            <div className="bank-transfer-layout">
              <div className="bank-transfer-qr">
                {qr ? (
                  <>
                    <img
                      src={qr}
                      alt={"Mã VietQR cho đơn " + state.orderNumber}
                    />
                    <p>
                      Quét bằng ứng dụng ngân hàng.
                      <br />
                      Giữ nguyên số tiền và nội dung.
                    </p>
                  </>
                ) : (
                  <p>
                    {active
                      ? "Mã QR chưa khả dụng. Kiểm tra lại trạng thái trước khi chuyển tiền."
                      : "QR đã được ẩn để tránh chuyển tiền lần nữa."}
                  </p>
                )}
              </div>
              <dl>
                {rows.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      <span>{value}</span>
                      {active ? (
                        <button
                          type="button"
                          aria-label={"Sao chép " + label}
                          onClick={() =>
                            void copy(
                              label,
                              label === "Số tiền" ? amount! : value,
                            )
                          }
                        >
                          <Copy aria-hidden="true" />
                        </button>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          <p className="bank-transfer-expiry">
            Hết hạn:{" "}
            {Number.isFinite(expiry)
              ? new Intl.DateTimeFormat("vi-VN", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(expiry)
              : "Không xác định"}
          </p>
          <div className="bank-transfer-notice">
            <ShieldCheck aria-hidden="true" />
            <p>
              Chỉ xác nhận sau khi nhân sự được phân quyền kiểm tra sao kê ngân
              hàng. Ảnh chụp màn hình hoặc thông báo của bạn không xác nhận đã
              nhận tiền và không cấp quyền học.
            </p>
          </div>
          <div className="bank-transfer-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => void refresh()}
            >
              <RefreshCw aria-hidden="true" />
              Kiểm tra trạng thái
            </button>
            {active ? (
              <button
                type="button"
                disabled={cancelling || busy}
                onClick={() => void onCancel()}
              >
                {cancelling ? "Đang kiểm tra…" : "Hủy yêu cầu thanh toán"}
              </button>
            ) : null}
          </div>
          <details>
            <summary>Đã chuyển tiền nhưng chưa được ghi nhận?</summary>
            <p>
              Không chuyển lại. Cung cấp thời điểm, số tiền và mã giao dịch để
              nhân sự tra soát. Không gửi mật khẩu, mã OTP hoặc ảnh chứa dữ liệu
              nhạy cảm.
            </p>
            <label htmlFor={"bank-support-" + payment.id}>Lý do tra soát</label>
            <textarea
              id={"bank-support-" + payment.id}
              minLength={8}
              maxLength={300}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Thời điểm chuyển, số tiền và mã giao dịch"
            />
            <button
              type="button"
              disabled={busy || reason.trim().length < 8}
              onClick={() => void support()}
            >
              Gửi yêu cầu tra soát
            </button>
          </details>
        </>
      )}
      {feedback ? <p role="status">{feedback}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
