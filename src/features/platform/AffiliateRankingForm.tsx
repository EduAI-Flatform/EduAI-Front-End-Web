import { useId } from 'react';
import { usePlatform } from './PlatformProvider';

export function AffiliateRankingForm({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) {
  const { t } = usePlatform();
  const id = useId();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return <p role="alert">{t('Cấu hình xếp hạng không hợp lệ. Hãy sửa bản nháp trước khi duyệt.', 'Invalid ranking configuration. Correct the draft before approval.')}</p>;
  const ranking = value as Record<string, unknown>;
  const choices: Array<{ key: string; name: string; options: Array<[string, string]> }> = [
    { key: 'basis', name: t('Cơ sở xếp hạng', 'Ranking basis'), options: [['recorded_signed_commission', t('Hoa hồng có dấu đã ghi nhận', 'Recorded signed commission')], ['recorded_referral_count', t('Lượt giới thiệu đã ghi nhận', 'Recorded referral count')]] },
    { key: 'period', name: t('Kỳ xếp hạng', 'Ranking period'), options: [['utc_day', t('Ngày UTC', 'UTC day')], ['utc_month', t('Tháng UTC', 'UTC month')], ['lifetime', t('Toàn thời gian', 'Lifetime')]] },
    { key: 'tiePolicy', name: t('Quy tắc đồng hạng', 'Tie policy'), options: [['competition', t('Đồng điểm cùng hạng, bỏ qua hạng kế tiếp', 'Competition: equal scores share rank, skip following ranks')]] },
  ];
  const ready = choices.every(choice => choice.options.some(([key]) => key === ranking[choice.key]));
  return <fieldset className="platform-form__object"><legend>{t('Xếp hạng giới thiệu', 'Affiliate ranking')}</legend>
    <p>{t('Báo cáo chỉ đọc, độc lập với bật giới thiệu và nguồn chi hoa hồng. Đây không phải thẻ thành viên, hạn mức hay số dư đã nạp. Chỉ áp dụng sau duyệt và ngày hiệu lực.', 'Read-only reporting, independent of affiliate admission and commission funding. This is not a member card, quota or paid balance. Applies only after approval and the effective date.')}</p>
    {choices.map(choice => <label className="platform-form__field" key={choice.key} htmlFor={`${id}-${choice.key}`}>{choice.name}
      <select id={`${id}-${choice.key}`} value={String(ranking[choice.key])} onChange={event => onChange({ ...ranking, [choice.key]: event.target.value })}>
        <option value="unconfigured">{t('Chọn rõ quy tắc', 'Choose explicitly')}</option>
        {choice.options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        {ranking[choice.key] !== 'unconfigured' && !choice.options.some(([key]) => key === ranking[choice.key]) && <option value={String(ranking[choice.key])} disabled>{t('Giá trị không được hỗ trợ', 'Unsupported value')}</option>}
      </select>
    </label>)}
    <label className="platform-form__check" htmlFor={`${id}-enabled`}><input id={`${id}-enabled`} type="checkbox" checked={ranking.enabled === true} disabled={!ready && ranking.enabled !== true} onChange={event => onChange({ ...ranking, enabled: event.target.checked })} />{t('Bật báo cáo xếp hạng', 'Enable ranking report')}</label>
    {!ready && <small>{t('Chọn cơ sở, kỳ và quy tắc đồng hạng trước khi bật.', 'Choose basis, period and tie policy before enabling.')}</small>}
  </fieldset>;
}
