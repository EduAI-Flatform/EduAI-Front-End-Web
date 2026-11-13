import type { CardServiceCapabilities, ServiceQuotaProjection } from '../../services/platform-settings.service';
import { usePlatform } from './PlatformProvider';
import { quotaAmount, quotaIssueText, quotaPeriodName, quotaServiceName } from './service-quota-format';
import './ServiceQuotaImpact.css';

export function ServiceQuotaImpact({ before, after }: { before?: ServiceQuotaProjection[] | null; after?: ServiceQuotaProjection[] | null }) {
  const { t, locale } = usePlatform();
  if (!before || !after) return <p>{t('Chưa thể mô phỏng quota còn lại từ dữ liệu hiện có.', 'Remaining quota cannot be projected from the available data.')}</p>;
  const ids = [...new Set([...before, ...after].map(item => item.definitionId))];
  const time = (value: string) => new Date(value).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', { timeZone: 'UTC' });
  function facts(quota?: ServiceQuotaProjection) {
    return quota ? <>
      <dl><dt>{t('Quota được cấp', 'Granted quota')}</dt><dd>{quotaAmount(quota.quota, locale)}</dd>
        <dt>{t('Đã dùng', 'Consumed')}</dt><dd>{quotaAmount(quota.consumed, locale)}</dd>
        <dt>{t('Còn lại', 'Remaining')}</dt><dd>{quotaAmount(quota.remaining, locale)}</dd></dl>
      <p>{quotaPeriodName(quota.resetPeriod, t)}</p>
      {quota.periodStartsAt && quota.periodEndsAt && <p>{time(quota.periodStartsAt)} → {time(quota.periodEndsAt)} UTC</p>}
      {quota.overLimit && <p>{t('Lượt đã dùng vượt hạn mức mới. Lịch sử không bị xóa.', 'Recorded usage exceeds the new quota. No history is deleted.')}</p>}
    </> : <p>{t('Không cấp quota thẻ', 'No card quota')}</p>;
  }
  return <section className="service-quota-impact" aria-label={t('Ảnh hưởng hạn mức dịch vụ', 'Service quota impact')}>
    {!ids.length && <p>{t('Không có quota thẻ trước và sau thay đổi.', 'No card quota before or after the change.')}</p>}
    {ids.map(id => {
      const previous = before.find(item => item.definitionId === id), next = after.find(item => item.definitionId === id);
      return <section key={id} className="service-quota-impact__service">
        <h4>{quotaServiceName((next ?? previous)!.code, t)}</h4>
        <div className="service-quota-impact__comparison">
          <fieldset><legend>{t('Trước', 'Before')}</legend>{facts(previous)}</fieldset>
          <fieldset><legend>{t('Sau', 'After')}</legend>{facts(next)}</fieldset>
        </div>
      </section>;
    })}
    <p>{t('Quota dịch vụ mua riêng và quyền học được giữ độc lập.', 'Purchased service quotas and course access remain separate.')}</p>
  </section>;
}

export function CardServiceBindingIssues({ issues, capabilities }: { issues: Array<{ definitionId: string; reason: string }>; capabilities?: CardServiceCapabilities }) {
  const { t } = usePlatform();
  if (!issues.length) return null;
  return <section className="service-quota-impact" aria-label={t('Cấu hình hạn mức cần sửa', 'Quota configuration needs attention')}>
    <h3>{t('Cấu hình hạn mức cần sửa', 'Quota configuration needs attention')}</h3>
    <ul>{issues.map((issue, index) => <li key={`${issue.definitionId}:${issue.reason}:${index}`}>
      <strong>{capabilities?.definitions.find(item => item.id.toLowerCase() === issue.definitionId.toLowerCase())?.displayName ?? issue.definitionId}</strong>
      {' — '}{quotaIssueText(issue.reason, t) ?? t('Chưa thể xác minh cấu hình này.', 'This configuration could not be verified.')}
    </li>)}</ul>
  </section>;
}
