import type { AffiliateSummary } from '../../services/affiliate.service';
import { usePlatform } from '../platform/PlatformProvider';
import { AffiliateRankingStat } from './AffiliateRankingStat';

export function AffiliateSummaryStats({ summary }: { summary?: AffiliateSummary }) {
  const { t, locale } = usePlatform();
  const unavailable = t('Chưa khả dụng', 'Unavailable');
  const asOf = summary ? new Date(summary.asOf) : null;
  const validSnapshot = !!summary && summary.currency === 'VND' && summary.timeZone === 'UTC'
    && summary.commissionBasis === 'recorded_signed_accruals' && !!asOf && Number.isFinite(asOf.getTime());
  const money = (value: string | null | undefined, signed = true) => {
    if (!validSnapshot || typeof value !== 'string' || !/^-?\d{1,40}$/.test(value) || (!signed && BigInt(value) < 0n)) return unavailable;
    return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(BigInt(value));
  };
  const periodAmount = (period: AffiliateSummary['today'] | undefined, month: boolean) => {
    if (!validSnapshot || !period || summary?.commissionStatus !== 'available') return unavailable;
    const starts = new Date(Date.UTC(asOf!.getUTCFullYear(), asOf!.getUTCMonth(), month ? 1 : asOf!.getUTCDate())).toISOString();
    if (period.startsAt !== starts || period.endsBefore !== summary.asOf) return unavailable;
    return money(period.amountMinor);
  };
  const revenueAvailable = validSnapshot && summary?.revenue?.status === 'available' && summary.revenue.complete === true
    && summary.revenue.basis === 'net_verified_paid_after_recorded_refunds';
  const revenueReason = summary?.revenue?.reason;
  const limited = revenueReason === 'SOURCE_SCAN_LIMIT_EXCEEDED' || revenueReason === 'REFUND_SCAN_LIMIT_EXCEEDED';
  return <>
    <AffiliateRankingStat summary={summary} />
    <article data-affiliate-summary="revenue"><h2>{t('Doanh thu giới thiệu', 'Referred revenue')}</h2><strong>{revenueAvailable ? money(summary.revenue.amountMinor, false) : unavailable}</strong>
      <small>{t('Thanh toán đã xác minh, sau hoàn tiền đã ghi nhận.', 'Verified paid value after recorded refunds.')}</small>
      {!revenueAvailable && summary && <small>{limited ? t('Chưa thể tính tổng đầy đủ trong giới hạn đối soát.', 'A complete total is unavailable within the source scan limit.') : t('Chưa đủ dữ liệu nguồn hợp lệ để tính tổng.', 'Valid source data is not available for a complete total.')}</small>}
    </article>
    <article data-affiliate-summary="month"><h2>{t('Hoa hồng tháng này', "This month's commission")}</h2><strong>{periodAmount(summary?.month, true)}</strong></article>
    <article data-affiliate-summary="today"><h2>{t('Hoa hồng hôm nay', "Today's commission")}</h2><strong>{periodAmount(summary?.today, false)}</strong></article>
    <article data-affiliate-summary="sub-affiliates"><h2>{t('Cộng tác viên cấp dưới', 'Sub-affiliates')}</h2><strong>{validSnapshot && summary?.subAffiliates?.status === 'disabled' && summary.subAffiliates.count === null ? t('Chưa bật', 'Disabled') : unavailable}</strong></article>
    {validSnapshot && <p className="affiliate-page__summary-period">{t('Hoa hồng đã ghi nhận theo ngày và tháng UTC, không phải số dư có thể rút. Cập nhật đến trước:', 'Recorded commission uses UTC calendar days and months, not withdrawable balance. Updated before:')} <time dateTime={summary.asOf}>{new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(asOf!)} UTC</time></p>}
  </>;
}
