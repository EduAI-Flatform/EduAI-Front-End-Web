import type { RankingImpact } from '../../services/platform-settings.service';
import { usePlatform } from './PlatformProvider';
import { rankingReasonText } from '../affiliate/ranking-labels';
import { quotaIssueText } from './service-quota-format';

export function RankingImpactPanel({ impact }: { impact: RankingImpact }) {
  const { t, locale } = usePlatform();
  const count = (value: number | null) => impact.complete && impact.comparable && Number.isSafeInteger(value) && value! >= 0
    ? new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(value!) : t('Chưa xác định', 'Unknown');
  const labels: Array<[keyof Pick<RankingImpact, 'examinedParticipants' | 'newlyRanked' | 'removedParticipants' | 'changedRanks' | 'unchangedRanks'>, string]> = [
    ['examinedParticipants', t('Người tham gia đã kiểm tra', 'Examined participants')], ['newlyRanked', t('Mới được xếp hạng', 'Newly ranked')],
    ['removedParticipants', t('Rời xếp hạng', 'Removed participants')], ['changedRanks', t('Thay đổi thứ hạng', 'Changed ranks')], ['unchangedRanks', t('Giữ nguyên thứ hạng', 'Unchanged ranks')],
  ];
  const asOf = new Date(impact.asOf);
  return <section className="platform-impact" data-ranking-impact>
    <h3>{t('Ảnh hưởng xếp hạng', 'Ranking impact')}</h3>
    <p role="status">{impact.complete && impact.comparable ? t('So sánh đầy đủ hai chính sách.', 'Complete paired policy comparison.') : t('Chưa thể so sánh đầy đủ; không sử dụng tổng một phần để duyệt.', 'A complete comparison is unavailable; do not approve using partial totals.')}</p>
    <div className="platform-impact__rows"><article>{labels.map(([key, label]) => <span key={key}>{label}: {count(impact[key])}</span>)}</article>
      <article><span>{t('Phiên bản trước', 'Before revision')}: {impact.beforeRevisionId ? <code>{impact.beforeRevisionId}</code> : t('Cấu hình mặc định', 'Default configuration')}</span>
        <span>{t('Phiên bản sau', 'After revision')}: <code>{impact.afterRevisionId}</code></span>
        <span>{t('Trước', 'Before')}: {Number.isFinite(asOf.getTime()) && impact.timeZone === 'UTC' ? <time dateTime={impact.asOf}>{new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(asOf)} UTC</time> : t('Chưa xác định', 'Unknown')}</span>
      </article></div>
    <p>{impact.activationReady ? t('Xếp hạng sẵn sàng theo quy trình duyệt và ngày hiệu lực.', 'Ranking is ready for the approval and effective-date workflow.') : t('Chưa sẵn sàng bật xếp hạng: cần nguồn dữ liệu đầy đủ và cấu hình được hỗ trợ.', 'Ranking activation blocked: complete source data and supported configuration are required.')}</p>
    {impact.activationBlockers.length > 0 && <ul>{impact.activationBlockers.map((reason, index) => <li key={index}>{reason === 'SUB_AFFILIATE_ATTRIBUTION_NOT_IMPLEMENTED' ? t('Chưa hỗ trợ ghi nhận giới thiệu cấp dưới.', 'Sub-affiliate attribution is not supported.') : quotaIssueText(reason, t) ?? rankingReasonText(reason, t)}</li>)}</ul>}
    {impact.exceptions.length > 0 && <ul>{impact.exceptions.map((exception, index) => <li key={index}>{exception.side === 'before' ? t('Chính sách trước', 'Before policy') : t('Chính sách sau', 'After policy')}: {rankingReasonText(exception.reason, t)} ({Number.isSafeInteger(exception.count) && exception.count >= 0 ? exception.count.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US') : t('Chưa xác định', 'Unknown')})</li>)}</ul>}
    <p>{t('Hạng thay đổi chỉ so sánh người có hạng ở cả hai phía. Bật báo cáo không cấp quyền học, cộng tiền, cấp hạn mức hay thay đổi thẻ thành viên.', 'Rank changes compare participants ranked on both sides. Reporting does not grant learning access, credit money, issue quotas or change member cards.')}</p>
  </section>;
}
