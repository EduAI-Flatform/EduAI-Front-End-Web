import type { CardServiceLimitSettings, MembershipPolicyContent, MembershipTier } from '../../services/membership-cards.service';
import type { CardServiceCapabilities } from '../../services/platform-settings.service';
import { PlatformSettingsForm } from './PlatformSettingsForm';
import { usePlatform } from './PlatformProvider';
import './MembershipPolicyForm.css';

const defaults: CardServiceLimitSettings = { enabled: false, consumptionPriority: 'purchased_first', termAnchorAt: '', termMonths: 0 };
export function MembershipPolicyForm({ value, onChange, capabilities, disabled = false }: {
  value: MembershipPolicyContent; onChange: (value: MembershipPolicyContent) => void;
  capabilities?: CardServiceCapabilities; disabled?: boolean;
}) {
  const { t, locale } = usePlatform();
  const settings = value.serviceLimits ?? defaults;
  const definitions = capabilities?.definitions ?? [];
  const updateSettings = (next: Partial<CardServiceLimitSettings>) => onChange({ ...value, serviceLimits: { ...settings, ...next } });
  const updateTier = (index: number, next: Partial<MembershipTier>) => onChange({ ...value,
    tiers: value.tiers.map((tier, position) => position === index ? { ...tier, ...next } : tier) });
  const base = Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'tiers' && key !== 'serviceLimits'));
  const sameDefinition = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();
  const hasFixedTerm = value.tiers.some(tier => tier.serviceLimits?.some(rule => definitions.find(item => sameDefinition(item.id, rule.definitionId))?.resetPeriod === 'membership_term'));
  const periodName = (period?: string) => period === 'none' ? t('Trọn đời', 'Lifetime')
    : period === 'calendar_month' ? t('Tháng dương lịch (UTC)', 'Calendar month (UTC)')
    : period === 'membership_term' ? t('Chu kỳ cố định bên dưới', 'Fixed term configured below') : t('Chọn dịch vụ để xem chu kỳ', 'Select a service to see its period');
  return <fieldset className="membership-policy-form" disabled={disabled}>
    <legend>{t('Thẻ và hạn mức dịch vụ', 'Cards and service quotas')}</legend>
    <PlatformSettingsForm field="membership" label={t('Quy tắc xét hạng', 'Rank qualification')} value={base}
      onChange={next => onChange({ ...value, ...(next as typeof base) })} />
    <p>{t('Chu kỳ xét hạng và chu kỳ hạn mức dịch vụ độc lập. Ngưỡng hạng phải tăng dần, bắt đầu từ 0.',
      'Rank qualification and service quota periods are independent. Tier thresholds must increase, starting at 0.')}</p>
    <section className="membership-policy-form__settings" aria-label={t('Thiết lập hạn mức', 'Quota settings')}>
      <h3>{t('Hạn mức dịch vụ', 'Service quotas')}</h3>
      <label className="platform-form__check"><input type="checkbox" checked={settings.enabled}
        onChange={event => updateSettings({ enabled: event.target.checked })} />{t('Bật hạn mức dịch vụ', 'Enable service quotas')}</label>
      <p role="status">{capabilities?.schemaReady
        ? capabilities.activationReady ? t('Hạ tầng đã xác minh. Chính sách chỉ áp dụng sau phê duyệt và ngày hiệu lực.', 'Infrastructure is verified. Policies apply only after approval and their effective date.')
          : t('Hạ tầng đã xác minh; tính năng chưa mở áp dụng. Bạn vẫn có thể soạn và xem trước bản nháp.', 'Infrastructure is verified; activation is not available yet. You can still edit and preview drafts.')
        : t('Hạ tầng chưa được xác minh để áp dụng. Bạn vẫn có thể soạn bản nháp.', 'Infrastructure is not verified for activation. You can still edit drafts.')}</p>
      {!capabilities && <p role="status">{t('Chưa tải được danh mục dịch vụ. Hãy tải lại trước khi thêm hạn mức.', 'The service catalog is unavailable. Reload before adding a quota.')}</p>}
      {capabilities && !definitions.some(item => item.executable) && <p>{t('Chưa có định nghĩa dịch vụ phù hợp. Cần khai báo dịch vụ theo lượt trước khi gắn hạn mức.',
        'No compatible service definitions are configured. Define a request-based service before assigning a quota.')}</p>}
      <label className="platform-form__field">{t('Thứ tự tiêu hao', 'Consumption priority')}
        <select value={settings.consumptionPriority} onChange={event => updateSettings({ consumptionPriority: event.target.value as CardServiceLimitSettings['consumptionPriority'] })}>
          <option value="purchased_first">{t('Dùng quota mua riêng trước', 'Purchased quota first')}</option>
          <option value="card_first">{t('Dùng quota thẻ trước', 'Card quota first')}</option>
        </select>
      </label>
      <p>{t('Mỗi lượt yêu cầu được chấp nhận tính một lượt, kể cả khi nhà cung cấp trả lỗi. Không cộng dồn quota các hạng; lượt đã dùng không được đặt lại khi đổi chính sách.',
        'Each admitted request counts as one attempt, including provider errors. Tier quotas are not added together; policy changes do not reset spent quota.')}</p>
    </section>
    {value.tiers.map((tier, index) => {
      const rules = tier.serviceLimits ?? [];
      return <fieldset className="membership-policy-form__tier" key={index}>
        <legend>{tier.name[locale] || tier.code || t('Hạng mới', 'New tier')}</legend>
        <PlatformSettingsForm field="tier" label={t('Thông tin hạng', 'Tier details')}
          value={{ code: tier.code, name: tier.name, threshold: tier.threshold, benefits: tier.benefits }}
          onChange={next => updateTier(index, next as Partial<MembershipTier>)} />
        <p>{t('Mã hạng dùng chữ thường, chữ số và dấu gạch nối; bắt đầu bằng chữ cái.', 'Tier codes use lowercase letters, digits and hyphens, starting with a letter.')}</p>
        <div className="membership-policy-form__rules">
          <h4>{t('Hạn mức cho hạng', 'Tier service quotas')}</h4>
          {!rules.length && <p>{t('Chưa cấp quota dịch vụ từ thẻ cho hạng này.', 'This tier has no card service quota.')}</p>}
          {rules.map((rule, ruleIndex) => {
            const selected = definitions.find(item => sameDefinition(item.id, rule.definitionId));
            const changeRule = (next: Partial<typeof rule>) => updateTier(index, { serviceLimits: rules.map((item, position) => position === ruleIndex ? { ...item, ...next } : item) });
            return <fieldset className="membership-policy-form__rule" key={ruleIndex}>
              <legend>{t('Dịch vụ', 'Service')} {ruleIndex + 1}</legend>
              <label className="platform-form__field">{t('Dịch vụ', 'Service')}
                <select required value={selected?.id ?? rule.definitionId} onChange={event => changeRule({ definitionId: event.target.value })}>
                  <option value="" disabled>{t('Chọn dịch vụ', 'Choose a service')}</option>
                  {rule.definitionId && !selected && <option value={rule.definitionId} disabled>{t('Dịch vụ không khả dụng', 'Unavailable service')}: {rule.definitionId}</option>}
                  {definitions.map(item => <option key={item.id} value={item.id} disabled={!item.executable || rules.some((other, position) => position !== ruleIndex && sameDefinition(other.definitionId, item.id))}>
                    {item.displayName} ({item.code}){!item.executable ? ` — ${t('Chưa hỗ trợ', 'Unsupported')}` : ''}
                  </option>)}
                </select>
              </label>
              <label className="platform-form__field">{t('Số lượt yêu cầu', 'Request quota')}
                <input type="text" inputMode="numeric" pattern="[1-9][0-9]{0,18}" maxLength={19} required value={rule.quota}
                  onChange={event => {
                    const quota = event.target.value;
                    event.target.setCustomValidity(/^[1-9][0-9]{0,18}$/.test(quota) && BigInt(quota) > 9223372036854775807n
                      ? t('Số lượt vượt giới hạn được hỗ trợ.', 'Quota exceeds the supported limit.') : '');
                    changeRule({ quota });
                  }} />
              </label>
              <p className="membership-policy-form__period">{periodName(selected?.resetPeriod)}</p>
              <button type="button" onClick={() => updateTier(index, { serviceLimits: rules.filter((_, position) => position !== ruleIndex) })}>{t('Xóa hạn mức', 'Remove quota')}</button>
            </fieldset>;
          })}
          <button type="button" disabled={!definitions.some(item => item.executable && !rules.some(rule => sameDefinition(rule.definitionId, item.id))) || rules.length >= 100}
            onClick={() => updateTier(index, { serviceLimits: [...rules, { definitionId: '', quota: '' }] })}>{t('Thêm hạn mức dịch vụ', 'Add service quota')}</button>
        </div>
        <div className="platform-form__row">
          <button type="button" disabled={index === 0} onClick={() => {
            const tiers = [...value.tiers]; [tiers[index - 1], tiers[index]] = [tiers[index], tiers[index - 1]]; onChange({ ...value, tiers });
          }}>{t('Đưa hạng lên', 'Move tier up')}</button>
          <button type="button" disabled={value.tiers.length <= 1} onClick={() => onChange({ ...value, tiers: value.tiers.filter((_, position) => position !== index) })}>{t('Xóa hạng', 'Remove tier')}</button>
        </div>
      </fieldset>;
    })}
    <button type="button" disabled={value.tiers.length >= 100} onClick={() => onChange({ ...value,
      tiers: [...value.tiers, { code: '', name: { vi: '', en: '' }, threshold: 0, benefits: [] }] })}>{t('Thêm hạng thẻ', 'Add card tier')}</button>
    {(hasFixedTerm || settings.termAnchorAt || settings.termMonths > 0) && <fieldset className="membership-policy-form__settings">
      <legend>{t('Chu kỳ quota cố định', 'Fixed quota term')}</legend>
      <label className="platform-form__field">{t('Mốc chu kỳ (ISO 8601 có múi giờ)', 'Term anchor (ISO 8601 with timezone)')}
        <input type="text" value={settings.termAnchorAt} required={hasFixedTerm} maxLength={100} placeholder="YYYY-MM-DDTHH:mm:ss+07:00"
          onChange={event => updateSettings({ termAnchorAt: event.target.value })} />
      </label>
      <label className="platform-form__field">{t('Thời lượng quota (tháng)', 'Quota term (months)')}
        <input type="number" min={hasFixedTerm ? 1 : 0} max={120} step={1} required={hasFixedTerm} value={settings.termMonths || ''}
          onChange={event => updateSettings({ termMonths: Number(event.target.value) })} />
      </label>
    </fieldset>}
    <p>{t('Quyền học và dịch vụ đã mua riêng được bảo toàn. Lưu bản nháp không tự thay đổi chính sách đang áp dụng.',
      'Independently purchased course and service rights are preserved. Saving a draft does not change the active policy.')}</p>
  </fieldset>;
}
