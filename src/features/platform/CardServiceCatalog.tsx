import { useState, type FormEvent } from 'react';
import { platformSettingsService, type CardServiceCapabilities } from '../../services/platform-settings.service';
import { usePlatform } from './PlatformProvider';
import { quotaPeriodName, quotaServiceName } from './service-quota-format';
import './CardServiceCatalog.css';

type ResetPeriod = 'NONE' | 'CALENDAR_MONTH' | 'MEMBERSHIP_TERM';
export function CardServiceCatalog({ capabilities, onRegistered, disabled = false }: {
  capabilities?: CardServiceCapabilities; onRegistered: () => Promise<unknown>; disabled?: boolean;
}) {
  const { t } = usePlatform();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<ResetPeriod | ''>('');
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);
  const available = capabilities?.supportedOperations.filter(operation =>
    !capabilities.definitions.some(definition => definition.code.toUpperCase() === operation.toUpperCase())) ?? [];
  async function reload() {
    setBusy(true); setError(false);
    try { await onRegistered(); setCode(''); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!registered && (!available.includes(code) || !name.trim() || !period)) return;
    setBusy(true); setError(false); setDone(false);
    try {
      if (!registered) {
        await platformSettingsService.createCardServiceDefinition({ code, displayName: name.trim(), resetPeriod: period as ResetPeriod });
        setRegistered(true);
      }
      await onRegistered();
      setRegistered(false); setCode(''); setName(''); setPeriod(''); setDone(true);
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  return <details className="card-service-catalog">
    <summary>{t('Danh mục dịch vụ', 'Service catalog')}</summary>
    <p>{t('Khai báo dịch vụ theo lượt yêu cầu. Chu kỳ của định nghĩa được giữ cố định để bảo toàn lịch sử; chọn chu kỳ trước khi đăng ký.',
      'Register a request-based service. Its definition period is immutable to preserve history; choose the period before registering.')}</p>
    {!capabilities && <p role="status">{t('Chưa tải được danh mục dịch vụ.', 'The service catalog is unavailable.')}</p>}
    {capabilities && !available.length && <p>{t('Không còn thao tác dịch vụ chưa đăng ký. Định nghĩa đã có không được ghi đè.', 'No unregistered service operations remain. Existing definitions cannot be overwritten.')}</p>}
    <form onSubmit={event => void submit(event)} aria-label={t('Đăng ký dịch vụ', 'Register request service')}>
      <fieldset disabled={disabled || busy || registered || !capabilities || !available.length}>
        <label className="platform-form__field">{t('Thao tác dịch vụ', 'Service operation')}
          <select required value={code} onChange={event => setCode(event.target.value)}><option value="">{t('Chọn dịch vụ', 'Select service')}</option>
            {available.map(operation => <option key={operation} value={operation}>{quotaServiceName(operation, t)}</option>)}
          </select>
        </label>
        <label className="platform-form__field">{t('Tên hiển thị', 'Display name')}
          <input required pattern=".*\S.*" maxLength={120} value={name} onChange={event => setName(event.target.value)} />
        </label>
        <label className="platform-form__field">{t('Chu kỳ đặt lại', 'Reset period')}
          <select required value={period} onChange={event => setPeriod(event.target.value as ResetPeriod | '')}>
            <option value="">{t('Chọn chu kỳ', 'Select period')}</option>
            {(['NONE', 'CALENDAR_MONTH', 'MEMBERSHIP_TERM'] as const).map(value => <option key={value} value={value}>{quotaPeriodName(value, t)}</option>)}
          </select>
        </label>
      </fieldset>
      <button type="submit" disabled={disabled || busy || (!registered && !available.length)}>
        {registered ? t('Tải lại danh mục dịch vụ', 'Reload service catalog') : t('Đăng ký dịch vụ', 'Register service')}
      </button>
    </form>
    {error && <p role="alert">{registered ? t('Dịch vụ đã được tạo nhưng chưa tải lại được danh mục. Thử tải lại; không cần đăng ký lại.', 'The service was created, but catalog reload failed. Retry reload without registering again.')
      : t('Không đăng ký được dịch vụ. Tải lại danh mục nếu thao tác này đã được khai báo.', 'Unable to register the service. Reload the catalog if this operation was already registered.')}</p>}
    {error && !registered && <button type="button" disabled={busy || disabled} onClick={() => void reload()}>{t('Tải lại danh mục dịch vụ', 'Reload service catalog')}</button>}
    {done && <p role="status">{t('Đã đăng ký dịch vụ. Cần gán quota trong bản nháp chính sách trước khi áp dụng.', 'Service registered. Assign quotas in a policy draft before applying them.')}</p>}
  </details>;
}
