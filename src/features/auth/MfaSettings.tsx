import { SystemText } from '@/features/platform/SystemText';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mfaService, type MfaEnrollment, type MfaStatus } from '../../services/mfa.service';
import { usePlatform } from '../platform/PlatformProvider';
import { clearAuthSession, setAuthSession } from './auth-store';
import './Mfa.css';
export function MfaSettings() {
  const { t } = usePlatform();
  const navigate = useNavigate();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    mfaService.status().then(value => { if (active) setStatus(value); }).catch(() => {
      if (active) setError(t('Không tải được trạng thái xác thực. Hãy thử lại hoặc đăng nhập lại.', 'Unable to load authenticator status. Retry or sign in again.'));
    });
    return () => { active = false; };
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch {
      setError(t('Không thực hiện được. Kiểm tra mã và đăng nhập lại trước khi thay đổi bảo mật.', 'Unable to complete this action. Check your code and sign in again before changing security settings.'));
    } finally { setBusy(false); }
  }
  async function confirm(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const result = await mfaService.confirm(code.trim());
      setAuthSession(result.session); setRecoveryCodes(result.recoveryCodes);
      setEnrollment(null); setCode(''); setStatus(await mfaService.status());
    });
  }
  return <section className="mfa-panel mfa-settings">
    <h2>{t('Xác thực hai bước', 'Two-factor authentication')}</h2>
    {error && <p role="alert" className="mfa-error"><SystemText message={error} /></p>}
    {notice && <p role="status"><SystemText message={notice} /></p>}
    {!status ? <button disabled={busy} onClick={() => void run(async () => setStatus(await mfaService.status()))}>{t('Tải lại trạng thái', 'Reload status')}</button>
      : !status.available ? <p>{t('Xác thực bằng ứng dụng chưa được cấu hình trên hệ thống.', 'Authenticator verification has not been configured on this system.')}</p>
      : <><p>{status.enabled ? t('Đã bật xác thực bằng ứng dụng.', 'Authenticator verification is enabled.') : t('Chưa bật xác thực bằng ứng dụng.', 'Authenticator verification is disabled.')}</p>
        <p>{t('Đăng nhập lại trước khi thiết lập, thay mã khôi phục hoặc tắt xác thực. Mỗi mã chỉ dùng một lần.', 'Sign in again before setup, replacing recovery codes or disabling verification. Each code can be used once.')}</p>
        <Link to="/login">{t('Đăng nhập lại', 'Sign in again')}</Link>
        {!status.enabled && !enrollment && <button className="mfa-primary" disabled={busy} onClick={() => void run(async () => { setRecoveryCodes([]); setEnrollment(await mfaService.enroll()); })}>{t('Thiết lập ứng dụng xác thực', 'Set up authenticator')}</button>}
        {enrollment && <form onSubmit={confirm}>
          <p>{t('Thêm tài khoản GDS vào ứng dụng xác thực bằng khóa thiết lập hoặc liên kết dưới đây.', 'Add your GDS account to your authenticator using the setup key or the link below.')}</p>
          <button type="button" onClick={() => setShowSecret(!showSecret)}>{showSecret ? t('Ẩn khóa', 'Hide key') : t('Hiện khóa thiết lập', 'Show setup key')}</button>
          {showSecret && <code className="mfa-secret">{enrollment.secret}</code>}
          <a className="mfa-setup-link" href={enrollment.otpauthUri}>{t('Mở trong ứng dụng xác thực', 'Open authenticator app')}</a>
          <label htmlFor="mfa-enrollment-code">{t('Mã 6 chữ số', 'Six-digit code')}</label>
          <input id="mfa-enrollment-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} required onChange={event => setCode(event.target.value)} />
          <button className="mfa-primary" disabled={busy} type="submit">{t('Kích hoạt', 'Enable')}</button>
          <button type="button" disabled={busy} onClick={() => { setEnrollment(null); setCode(''); setShowSecret(false); }}>{t('Hủy', 'Cancel')}</button>
        </form>}
        {status.enabled && <div>
          <p>{t('Mã khôi phục còn lại', 'Recovery codes remaining')}: {status.recoveryCodesRemaining}</p>
          <label htmlFor="mfa-settings-code">{t('Mã xác thực mới hoặc mã khôi phục', 'New authenticator or recovery code')}</label>
          <input id="mfa-settings-code" autoComplete="one-time-code" value={code} maxLength={27} onChange={event => setCode(event.target.value)} />
          <div className="mfa-actions">
            <button disabled={busy || !code.trim()} onClick={() => void run(async () => {
              const result = await mfaService.recoveryCodes(code.trim());
              setAuthSession(result.session); setRecoveryCodes(result.recoveryCodes); setCode(''); setStatus(await mfaService.status());
            })}>{t('Tạo lại mã khôi phục', 'Replace recovery codes')}</button>
            <button disabled={busy || !code.trim()} onClick={() => void run(async () => {
              await mfaService.disable(code.trim()); clearAuthSession(); navigate('/login', { replace: true });
            })}>{t('Tắt xác thực hai bước', 'Disable two-factor authentication')}</button>
          </div>
        </div>}
      </>}
    {recoveryCodes.length > 0 && <section className="mfa-recovery">
      <h3>{t('Lưu mã khôi phục', 'Save your recovery codes')}</h3>
      <p>{t('Các mã này chỉ hiển thị trong lần tạo này. Lưu ở nơi riêng tư trước khi rời trang.', 'These codes are displayed only when created. Save them privately before leaving this page.')}</p>
      <ul>{recoveryCodes.map(value => <li key={value}><code>{value}</code></li>)}</ul>
      <button onClick={() => void run(async () => { await navigator.clipboard.writeText(recoveryCodes.join('\n')); setNotice(t('Đã sao chép mã khôi phục.', 'Recovery codes copied.')); })}>{t('Sao chép mã', 'Copy codes')}</button>
      <button onClick={() => setRecoveryCodes([])}>{t('Tôi đã lưu mã', 'I saved my codes')}</button>
    </section>}
  </section>;
}
