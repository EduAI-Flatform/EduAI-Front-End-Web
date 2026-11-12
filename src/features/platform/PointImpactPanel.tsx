import type { PointImpact } from '../../services/platform-settings.service';
import { usePlatform } from './PlatformProvider';

export function PointImpactPanel({ impact }: { impact: PointImpact }) {
  const { t, locale } = usePlatform();
  const language = locale === 'vi' ? 'vi-VN' : 'en-US';
  const number = (value: number) => value.toLocaleString(language);
  const date = (value: string) => new Date(value).toLocaleString(language);
  return <section className="platform-impact">
    <h3>{t('Mô phỏng chính sách điểm', 'Point policy simulation')}</h3>
    <p>{t('Mô phỏng trên hoạt động hoàn thành khóa học gần đây, không phải dự báo số điểm sẽ phát hành.',
      'Simulation of recent course completions, not a forecast of future point issuance.')}</p>
    <p>{t('Khoảng dữ liệu', 'Sample window')}: {date(impact.windowStart)} – {date(impact.windowEnd)}</p>
    {impact.status === 'limit_exceeded' ? <p role="status">{t(
      `Vượt giới hạn ${number(impact.sampleLimit)} hoạt động. Chưa thể đưa ra tổng ảnh hưởng đầy đủ; không sử dụng dữ liệu cắt bớt để phê duyệt.`,
      `The sample exceeds ${number(impact.sampleLimit)} activities. Complete impact totals are unavailable; do not approve using a truncated estimate.`,
    )}</p> : <>
      {impact.sampledEvents === 0 && <p>{t('Chưa có khóa học hoàn thành trong khoảng dữ liệu này.', 'No completed courses in this sample window.')}</p>}
      <div className="platform-impact__rows">
        <article>
          <span>{t('Hoạt động trong mẫu', 'Sampled activities')}: {number(impact.sampledEvents)}</span>
          <span>{t('Người học trong mẫu', 'Sampled learners')}: {number(impact.sampledLearners)}</span>
          <span>{t('Người học có kết quả thay đổi', 'Learners with changed results')}: {number(impact.affectedLearners)}</span>
          <span>{t('Hoạt động đổi số điểm hoặc hạn dùng', 'Activities with changed points or validity')}: {number(impact.changedEvents)}</span>
        </article>
        <article>
          <span>{t('Điểm theo chính sách hiện tại', 'Points under current policy')}: {number(impact.beforePoints)}</span>
          <span>{t('Điểm theo bản nháp', 'Points under draft policy')}: {number(impact.afterPoints)}</span>
        </article>
      </div>
    </>}
    <div className="platform-impact__rows"><article>
      <span>{t('Phiên bản hiện tại', 'Current revision')}: {impact.beforeRevisionId
        ? <code>{impact.beforeRevisionId}</code> : t('Cấu hình mặc định', 'Default configuration')}</span>
      <span>{t('Phiên bản đề xuất', 'Proposed revision')}: <code>{impact.afterRevisionId}</code></span>
    </article></div>
    <p>{t('Không cộng lại điểm cũ. Điểm đã ghi nhận giữ chính sách và hạn dùng gốc; quyền học đã mua được bảo toàn.',
      'Historical awards are not recalculated. Recorded points retain their original policy and validity; purchased course access is preserved.')}</p>
  </section>;
}
