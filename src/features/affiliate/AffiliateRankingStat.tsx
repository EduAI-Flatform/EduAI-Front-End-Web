import type { AffiliateSummary } from '../../services/affiliate.service';
import { usePlatform } from '../platform/PlatformProvider';
import { rankingReasonText } from './ranking-labels';

export function AffiliateRankingStat({ summary }: { summary?: AffiliateSummary }) {
  const { t, locale } = usePlatform();
  const ranking = summary?.ranking;
  const date = new Date(summary?.asOf ?? '');
  const snapshot = !!summary && Number.isFinite(date.getTime()) && summary.timeZone === 'UTC';
  const startsAt = ranking?.period === 'lifetime' ? null : snapshot
    ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), ranking?.period === 'utc_month' ? 1 : date.getUTCDate())).toISOString() : undefined;
  const valid = snapshot && ranking?.status === 'available' && Number.isSafeInteger(ranking.value) && ranking.value! > 0
    && ranking.complete === true && ranking.timeZone === 'UTC' && ranking.asOf === summary.asOf && ranking.endsBefore === summary.asOf
    && typeof ranking.policyRevisionId === 'string' && ranking.policyRevisionId.trim().length > 0
    && ['recorded_signed_commission', 'recorded_referral_count'].includes(ranking.basis ?? '')
    && ['utc_day', 'utc_month', 'lifetime'].includes(ranking.period ?? '') && ranking.tiePolicy === 'competition' && ranking.startsAt === startsAt;
  const status = snapshot && ranking?.value === null ? ranking.status : 'unavailable';
  const label = valid ? `#${new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(ranking!.value!)}`
    : status === 'unconfigured' ? t('Chưa cấu hình', 'Unconfigured')
    : status === 'disabled' ? t('Chưa bật', 'Disabled')
    : status === 'not_participating' ? t('Chưa tham gia xếp hạng', 'Not participating') : t('Chưa khả dụng', 'Unavailable');
  return <article data-affiliate-summary="ranking"><h2>{t('Xếp hạng', 'Ranking')}</h2><strong>{label}</strong>
    <small>{t('Báo cáo giới thiệu; không phải thẻ thành viên, hạn mức hay số dư đã nạp.', 'Referral reporting; not a member card, quota or paid balance.')}</small>
    {valid && <>
      <small>{ranking!.basis === 'recorded_signed_commission' ? t('Hoa hồng có dấu đã ghi nhận', 'Recorded signed commission') : t('Lượt giới thiệu đã ghi nhận', 'Recorded referral count')}; {ranking!.period === 'utc_day' ? t('Ngày UTC', 'UTC day') : ranking!.period === 'utc_month' ? t('Tháng UTC', 'UTC month') : t('Toàn thời gian', 'Lifetime')}; {t('Đồng điểm cùng hạng', 'Competition ties')}</small>
      <small>{t('Phiên bản', 'Revision')}: <code>{ranking!.policyRevisionId}</code>; {t('Trước', 'Before')}: <time dateTime={summary!.asOf}>{new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date)} UTC</time></small>
    </>}
    {!valid && <small>{rankingReasonText(ranking?.reason, t)}</small>}
  </article>;
}
