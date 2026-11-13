import { useEffect, useState } from 'react';
import { membershipCardsService, type CardServiceQuotaState } from '../../services/membership-cards.service';
import { usePlatform } from '../platform/PlatformProvider';
import { quotaAmount, quotaPeriodName, quotaServiceName } from '../platform/service-quota-format';
import './CardServiceQuotas.css';

export function CardServiceQuotas() {
  const { t, locale } = usePlatform();
  const [state, setState] = useState<CardServiceQuotaState | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState(null); setError(false);
    membershipCardsService.quotas().then(value => { if (active) setState(value); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  const amount = (value: string | null) => value === null ? t('Chưa có dữ liệu', 'Unavailable') : quotaAmount(value, locale);
  const time = (value: string) => new Date(value).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', { timeZone: 'UTC' });
  return <section className="card-service-quotas" aria-label={t('Hạn mức dịch vụ thẻ của bạn', 'Your card service quotas')}>
    <h2>{t('Hạn mức dịch vụ thẻ', 'Card service quotas')}</h2>
    {!state && !error && <p role="status">{t('Đang tải hạn mức.', 'Loading quotas.')}</p>}
    {error && <div role="alert"><p>{t('Không tải được hạn mức dịch vụ.', 'Unable to load service quotas.')}</p>
      <button type="button" onClick={() => setAttempt(value => value + 1)}>{t('Thử lại', 'Try again')}</button></div>}
    {state && !state.cardItems && <p role="status">{t('Chưa có thông tin hạn mức thẻ.', 'Card quota information is not available yet.')}</p>}
    {state?.cardItems && <>
      {!state.cardItems.length && <p>{t('Hiện chưa có quota thẻ khả dụng.', 'No current card quota is available.')}</p>}
      <div className="card-service-quotas__items">{state.cardItems.map(item => <article key={item.code}>
        <h3>{quotaServiceName(item.code, t)}</h3>
        <dl><dt>{t('Quota được cấp', 'Granted quota')}</dt><dd>{amount(item.quota)}</dd>
          <dt>{t('Đã dùng', 'Consumed')}</dt><dd>{amount(item.consumed)}</dd>
          <dt>{t('Còn lại', 'Remaining')}</dt><dd>{amount(item.remaining)}</dd></dl>
        <p>{quotaPeriodName(item.resetPeriod, t)}</p>
        {item.periodStartsAt && item.periodEndsAt && <p>{time(item.periodStartsAt)} → {time(item.periodEndsAt)} UTC</p>}
        {!item.allowed && <p>{t('Quota hiện không khả dụng hoặc đã dùng hết.', 'This quota is unavailable or exhausted.')}</p>}
      </article>)}</div>
      <p>{t('Quota tính theo lượt yêu cầu được tiếp nhận, kể cả khi nhà cung cấp gặp lỗi.', 'Quotas count admitted requests, including provider errors.')}</p>
    </>}
    <p>{t('Quota dịch vụ mua riêng và quyền học được giữ độc lập.', 'Purchased service quotas and course access remain separate.')}</p>
  </section>;
}
