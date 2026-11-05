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
          <strong>Chưa mở được thanh toán</strong>
          <p>Vui lòng tải lại trạng thái hoặc liên hệ hỗ trợ.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="payment-vnpay-hosted" aria-label={`Thanh toán trực tuyến cho đơn ${orderNumber}`}>
      <div className="payment-vnpay-hosted__heading">
        <div>
          <span>Thanh toán trực tuyến</span>
          <strong>Thanh toán trực tuyến</strong>
        </div>
        <ShieldCheck aria-hidden="true" />
      </div>
      <div className="payment-vnpay-hosted__body">
        <p>Tiếp tục để mở trang thanh toán.</p>
        <button
          aria-label="Tiếp tục thanh toán"
          className="payment-vnpay-hosted__button"
          disabled={redirecting}
          onClick={continueToVnPay}
          type="button"
        >
          <ExternalLink aria-hidden="true" />
          {redirecting ? 'Đang mở thanh toán…' : 'Tiếp tục thanh toán'}
        </button>
      </div>
    </section>
  );
}
