import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Link2 } from 'lucide-react';
import { affiliateService } from '../../../../services/affiliate.service';
import { membershipCardsService } from '../../../../services/membership-cards.service';
import { usePlatform } from '../../../platform/PlatformProvider';
import './ProfileMembershipReferralPanel.css';

function useReadOnlyResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    setData(null);
    load().then(value => { if (active) setData(value); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, attempt]);

  return { data, loading, failed, retry: () => setAttempt(value => value + 1) };
}

function safeReferralUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.username || url.password) return null;
    return url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === window.location.origin) ? url.href : null;
  } catch { return null; }
}

export function ProfileMembershipReferralPanel() {
  const { t, locale } = usePlatform();
  const membership = useReadOnlyResource(membershipCardsService.mine);
  const referral = useReadOnlyResource(affiliateService.state);
  const cardHeadingId = useId();
  const referralHeadingId = useId();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const evaluation = membership.data?.evaluation;
  const evaluatedTier = membership.data?.policy.enabled && evaluation?.status === 'evaluated' ? evaluation.tier : null;
  const identity = referral.data?.enabled ? referral.data.identities.find(item => item.kind === 'general' && item.status === 'active') : null;
  const referralUrl = safeReferralUrl(identity?.referralUrl);

  async function copyReferral() {
    if (!referralUrl) return;
    try { await navigator.clipboard.writeText(referralUrl); setCopyState('copied'); }
    catch { setCopyState('failed'); }
  }

  return <div className="profile-membership-referral">
    <section className="student-profile-card profile-membership-referral__section" aria-labelledby={cardHeadingId}>
      <h2 id={cardHeadingId}><CreditCard aria-hidden="true" />{t('Thẻ thành viên', 'Membership card')}</h2>
      {membership.loading && <p role="status">{t('Đang tải thông tin thẻ.', 'Loading your card.')}</p>}
      {membership.failed && <div role="alert"><p>{t('Không tải được thông tin thẻ.', 'Unable to load membership card.')}</p><button type="button" onClick={membership.retry}>{t('Thử lại', 'Try again')}</button></div>}
      {membership.data && (evaluatedTier
        ? <p className="profile-membership-referral__tier">{evaluatedTier.name[locale] || evaluatedTier.name.vi}</p>
        : <p>{!membership.data.policy.enabled || evaluation?.status === 'disabled'
          ? t('Chính sách thẻ thành viên chưa được áp dụng.', 'Membership card policy is not active.')
          : t('Chưa thể xác định hạng thẻ của bạn.', 'Your membership tier is currently unavailable.')}</p>)}
      <Link to="/membership-cards">{t('Xem thông tin thẻ', 'View card details')}</Link>
    </section>
    <section className="student-profile-card profile-membership-referral__section" aria-labelledby={referralHeadingId}>
      <h2 id={referralHeadingId}><Link2 aria-hidden="true" />{t('Giới thiệu bạn bè', 'Refer friends')}</h2>
      {referral.loading && <p role="status">{t('Đang tải liên kết giới thiệu.', 'Loading your referral link.')}</p>}
      {referral.failed && <div role="alert"><p>{t('Không tải được liên kết giới thiệu.', 'Unable to load referral link.')}</p><button type="button" onClick={() => { setCopyState('idle'); referral.retry(); }}>{t('Thử lại', 'Try again')}</button></div>}
      {referral.data && (!referral.data.enabled
        ? <p>{t('Chương trình giới thiệu chưa được mở.', 'The referral program is not active.')}</p>
        : referralUrl ? <div className="profile-membership-referral__link">
          <a href={referralUrl} aria-label={t('Liên kết giới thiệu của tôi', 'My referral link')}>{referralUrl}</a>
          <button type="button" onClick={() => void copyReferral()}>{t('Sao chép liên kết', 'Copy link')}</button>
          {copyState === 'copied' && <p role="status">{t('Đã sao chép liên kết.', 'Referral link copied.')}</p>}
          {copyState === 'failed' && <p role="status">{t('Chưa sao chép được. Bạn có thể chọn liên kết để sao chép thủ công.', 'Unable to copy. Select the link to copy it manually.')}</p>}
        </div> : <p>{t('Bạn chưa có liên kết giới thiệu đang hoạt động.', 'You do not have an active referral link yet.')}</p>)}
      <Link to="/affiliate">{t('Xem chương trình giới thiệu', 'View referral program')}</Link>
    </section>
  </div>;
}
