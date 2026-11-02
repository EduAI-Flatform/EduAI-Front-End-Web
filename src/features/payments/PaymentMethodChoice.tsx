import { useEffect, useState } from "react";
import {
  paymentService,
  type PaymentProvider,
} from "../../services/payment.service";
import { formatGdsVnd, gdsWalletService } from '../../services/gds-wallet.service';
import './PaymentMethodChoice.css';
export type CheckoutMethod = PaymentProvider | 'gds_wallet';
export function usePaymentMethodChoice() {
  const [methods, setMethods] = useState<CheckoutMethod[]>([]);
  const [selected, setSelected] = useState<CheckoutMethod | undefined>();
  const [gdsAvailableBalance, setGdsAvailableBalance] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    // Defer method calls into promises: absent/temporarily unavailable API
    // adapters must fail closed instead of throwing during React effect setup.
    void Promise.allSettled([
      Promise.resolve().then(() => paymentService.methods()),
      Promise.resolve().then(() => gdsWalletService.summary()),
    ])
      .then(([paymentResult, walletResult]) => {
        if (mounted) {
          // PayOS is the only external method for new purchases. GDS is a
          // separate internal instrument, enabled only by the wallet API UAT.
          const visible: CheckoutMethod[] = paymentResult.status === 'fulfilled'
            ? paymentResult.value.filter((method) => method === 'payos') : [];
          const wallet = walletResult.status === 'fulfilled' ? walletResult.value : null;
          const enableGds = wallet?.available === true && wallet.paymentEnabled === true &&
            wallet.state === 'READY_SANDBOX' && wallet.balance?.currency === 'VND';
          if (enableGds) visible.push('gds_wallet');
          setGdsAvailableBalance(enableGds ? wallet.balance?.availableMinor ?? null : null);
          setMethods(visible);
          // Never silently choose any payable instrument.
          // The learner explicitly selects a method before any QR is created.
          setSelected((current) => current && visible.includes(current) ? current : undefined);
        }
      })
    return () => {
      mounted = false;
    };
  }, []);
  return { methods, selected, setSelected, gdsAvailableBalance };
}
export function PaymentMethodChoice({
  choice,
  disabled = false,
}: {
  choice: Pick<ReturnType<typeof usePaymentMethodChoice>, 'methods' | 'selected' | 'setSelected'> & {
    gdsAvailableBalance?: string | null;
  };
  disabled?: boolean;
}) {
  const payosEnabled = choice.methods.includes('payos');
  const gdsEnabled = choice.methods.includes('gds_wallet');

  return (
    <fieldset className="payment-method-choice" disabled={disabled}>
      <legend>Phương thức thanh toán</legend>
      <p className="payment-method-choice__help" id="payment-method-choice-help">
        {gdsEnabled
          ? 'Chọn PayOS để quét QR hoặc dùng số dư Ví GDS.'
          : payosEnabled ? 'Chọn phương thức trước khi tạo mã QR.'
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
      <label className={`payment-method-choice__card ${gdsEnabled ? '' : 'payment-method-choice__card--unavailable'} ${choice.selected === 'gds_wallet' ? 'payment-method-choice__card--selected' : ''}`}>
        <input
          checked={choice.selected === 'gds_wallet'}
          disabled={!gdsEnabled}
          name="checkout-payment-method"
          onChange={() => choice.setSelected('gds_wallet')}
          type="radio"
          value="gds_wallet"
        />
        <span><strong>Ví GDS</strong><small>{gdsEnabled
          ? `Thanh toán bằng số dư ${formatGdsVnd(choice.gdsAvailableBalance)}`
          : 'Ví tiền chưa khả dụng'}</small></span>
      </label>
      <small className="payment-method-choice__footer">Điểm TMI không dùng để thanh toán. VNPay và QR MB tạm ẩn.</small>
    </fieldset>
  );
}
