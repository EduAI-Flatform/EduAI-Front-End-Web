import { SystemText } from '@/features/platform/SystemText';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { membershipCardsService, type MembershipCardState } from '../../services/membership-cards.service';
import { usePlatform } from '../platform/PlatformProvider';
import { CardServiceQuotas } from './CardServiceQuotas';
import './MembershipCardsPage.css';
export function MembershipCardsPage() {
  const { t, locale } = usePlatform();
  const [state, setState] = useState<MembershipCardState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true); setError('');
    try { setState(await membershipCardsService.mine()); }
    catch { setError(t('Không tải được thông tin thẻ.', 'Unable to load membership card.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const money = (amount: string | number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency', currency: state?.policy.currency || 'VND', maximumFractionDigits: 0,
  }).format(BigInt(amount));
  return <section className="membership-cards container">
    <header><h1>{t('Thẻ thành viên', 'Membership cards')}</h1></header>
    {loading && <p role="status">{t('Đang tải thông tin thẻ…', 'Loading your card…')}</p>}
    {error && <div role="alert"><p><SystemText message={error} /></p><button onClick={() => void load()}>{t('Thử lại', 'Try again')}</button></div>}
    {state && <>
      <section className="membership-cards__current">
        <CreditCard aria-hidden="true" />
        <h2>{state.evaluation.tier?.name[locale] || t('Chính sách thẻ chưa được áp dụng', 'Card policy is not active')}</h2>
        {state.evaluation.status === 'evaluated' && state.evaluation.qualifyingAmountMinor !== null
          ? <p>{(state.evaluation.basis ?? state.policy.basis) === 'topup' ? t('Nạp tiền hợp lệ', 'Qualifying top-ups') : t('Chi tiêu hợp lệ', 'Qualifying spending')} <strong>{money(state.evaluation.qualifyingAmountMinor)}</strong></p>
          : <p>{t('Hạng thẻ sẽ hiển thị sau khi chính sách được duyệt và áp dụng.', 'Your tier will appear after the policy has been approved and activated.')}</p>}
        {state.evaluation.status === 'unavailable' && <p role="status">{t('Nguồn xét hạng đang được đối soát.', 'Qualification data is being reconciled.')}</p>}
        {state.evaluation.windowStartsAt && state.evaluation.windowEndsAt && <p>{new Date(state.evaluation.windowStartsAt).toLocaleDateString(locale)} — {new Date(state.evaluation.windowEndsAt).toLocaleDateString(locale)}</p>}
        {state.evaluation.policyRevisionId && <small>{t('Phiên bản chính sách', 'Policy revision')} {state.evaluation.policyRevisionId}</small>}
      </section>
      <div className="membership-cards__tiers">{state.policy.tiers.map(tier => <article key={tier.code} className={state.evaluation.tier?.code === tier.code ? 'membership-cards__tier membership-cards__tier--current' : 'membership-cards__tier'}>
        <h2>{tier.name[locale] || tier.name.vi}</h2>
        <p>{state.policy.enabled ? money(tier.threshold) : t('Ngưỡng xét hạng chưa được áp dụng', 'Qualification threshold is not active')}</p>
        {tier.benefits.length > 0 ? <ul>{tier.benefits.map((benefit, index) => <li key={index}>{benefit[locale] || benefit.vi}</li>)}</ul>
          : <p>{t('Quyền lợi sẽ được công bố cùng chính sách.', 'Benefits will be published with the policy.')}</p>}
      </article>)}</div>
      {state.legacyPurchasedAccessPreserved && <p>{t('Quyền học đã mua được giữ nguyên.', 'Your purchased course access is preserved.')}</p>}
      <CardServiceQuotas />
      <nav className="membership-cards__links"><Link to="/billing">{t('Billing', 'Billing')}</Link><Link to="/dashboard/learning">{t('Việc học của tôi', 'My learning')}</Link></nav>
    </>}
  </section>;
}
