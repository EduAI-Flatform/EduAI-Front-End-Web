import { ExternalLink, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { getTrustedCheckoutUrl } from '../../services/payment.service';

type VnPayHostedCheckoutProps = {
  checkoutUrl?: string;
  orderNumber: string;
  navigate?: (url: string) => void;
};

export function VnPayHostedCheckout({ checkoutUrl, navigate, orderNumber }: VnPayHostedCheckoutProps) {
  const [redirecting, setRedirecting] = useState(false);
  const trustedCheckoutUrl = getTrustedCheckoutUrl(checkoutUrl, 'vnpay');

  function continueToVnPay() {
    if (!trustedCheckoutUrl || redirecting) return;
    setRedirecting(true);
    (navigate ?? ((url: string) => window.location.assign(url)))(trustedCheckoutUrl);
  }

  if (!trustedCheckoutUrl) {
    return (
      <section className="payment-checkout-expired payment-checkout-expired--neutral" role="status">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Chưa có liên kết VNPay khả dụng</strong>
          <p>EduAI chưa nhận được liên kết VNPay hợp lệ cho yêu cầu này. Trạng thái đơn vẫn do máy chủ xác nhận.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="payment-vnpay-hosted" aria-label={`Thanh toán VNPay cho đơn ${orderNumber}`}>
      <div className="payment-vnpay-hosted__heading">
        <div>
          <span>Thanh toán trực tuyến</span>
          <strong>Thanh toán qua VNPay</strong>
        </div>
        <ShieldCheck aria-hidden="true" />
      </div>
      <div className="payment-vnpay-hosted__body">
        <p>EduAI sẽ mở cổng VNPay trong một trang an toàn để bạn hoàn tất thanh toán.</p>
        <button
          aria-label="Tiếp tục thanh toán VNPay"
          className="payment-vnpay-hosted__button"
          disabled={redirecting}
          onClick={continueToVnPay}
          type="button"
        >
          <ExternalLink aria-hidden="true" />
          {redirecting ? 'Đang mở VNPay…' : 'Tiếp tục thanh toán VNPay'}
        </button>
        <p className="payment-vnpay-hosted__note" role="status">
          EduAI chỉ cập nhật đơn khi trạng thái từ backend được xác nhận; dữ liệu trên trình duyệt không tự xác nhận thanh toán.
        </p>
      </div>
    </section>
  );
}
