import { useEffect, useState } from "react";
import {
  paymentService,
  type PaymentProvider,
} from "../../services/payment.service";
import { formatGdsVnd, gdsWalletService, hasTrustedGdsBalance } from '../../services/gds-wallet.service';
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
    let external: CheckoutMethod[] = [];
    let gdsReady = false;
    const publish = () => {
      if (!mounted) return;
      const visible: CheckoutMethod[] = [...external, ...(gdsReady ? ['gds_wallet' as const] : [])];
      setMethods(visible);
      setSelected(current => current && visible.includes(current) ? current : undefined);
    };
    void Promise.resolve().then(() => paymentService.methods()).then(result => {
      external = result.filter(method => method === 'payos'); publish();
    }, () => { external = []; publish(); });
    void Promise.resolve().then(() => gdsWalletService.summary()).then(wallet => {
      if (!mounted) return;
      const trusted = hasTrustedGdsBalance(wallet) && wallet.paymentEnabled === true && /^\d+$/.test(wallet.balance.availableMinor);
      setGdsAvailableBalance(trusted ? wallet.balance.availableMinor : null);
      gdsReady = trusted && BigInt(wallet.balance.availableMinor) > 0n;
      publish();
    }, () => { if (mounted) setGdsAvailableBalance(null); gdsReady = false; publish(); });
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
          ? 'Quét mã QR hoặc dùng số dư Ví GDS.'
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
          <span><strong>Quét mã QR</strong><small>Thanh toán bằng ứng dụng ngân hàng</small></span>
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
          : choice.gdsAvailableBalance === '0' ? 'S\u1ed1 d\u01b0 0\u0111' : 'Ví tiền chưa khả dụng'}</small></span>
      </label>
      {choice.gdsAvailableBalance === '0' && <p className="payment-method-choice__topup"><span>{'S\u1ed1 d\u01b0 0\u0111 \u2014 N\u1ea1p ti\u1ec1n \u0111\u1ec3 thanh to\u00e1n'}</span>{' '}<a href="/wallet/gds">{'N\u1ea1p ti\u1ec1n v\u00e0o v\u00ed'}</a></p>}
      <small className="payment-method-choice__footer">Điểm TMI không dùng để thanh toán.</small>
    </fieldset>
  );
}
