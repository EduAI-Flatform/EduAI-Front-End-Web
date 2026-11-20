import { SystemText } from '@/features/platform/SystemText';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiClientError } from '../../services/api-client';
import { getAuthSession, type AuthSession } from '../../services/auth.service';
import { MfaReauthentication } from './MfaReauthentication';
import { mfaService, type MfaEnrollment, type MfaStatus } from '../../services/mfa.service';
import { usePlatform } from '../platform/PlatformProvider';
import { clearAuthSession, setAuthSession, useAuthSession } from './auth-store';
import './Mfa.css';
export function MfaSettings() {
  const { t } = usePlatform();
  const navigate = useNavigate();
  const session = useAuthSession();
  const pendingAction = useRef<{ execute: (freshCode?: string) => Promise<void>; requiresCode: boolean; expected: AuthSession } | null>(null);
  const [reauthenticate, setReauthenticate] = useState(false);
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    pendingAction.current = null; setReauthenticate(false);
    setEnrollment(null); setRecoveryCodes([]); setCode(''); setShowSecret(false);
  }, [session?.user.id]);
  useEffect(() => {
    let active = true;
    mfaService.status().then(value => { if (active) setStatus(value); }).catch(() => {
      if (active) setError(t('Không tải được trạng thái xác thực. Hãy thử lại hoặc đăng nhập lại.', 'Unable to load authenticator status. Retry or sign in again.'));
    });
    return () => { active = false; };
  }, [session?.user.id]);
  async function run(action: (freshCode?: string) => Promise<void>, resumed = false, requiresCode = false, freshCode?: string) {
    setBusy(true); setError(''); setNotice('');
    try { await action(freshCode); } catch (failure) {
      if (!resumed && session && getAuthSession()?.user.id === session.user.id && failure instanceof ApiClientError && failure.code === 'MFA_REAUTHENTICATION_REQUIRED') {
        pendingAction.current = { execute: action, requiresCode, expected: getAuthSession()! }; setReauthenticate(true);
      } else {
        setError(t('Không thực hiện được. Kiểm tra mã xác thực và thử lại. Mỗi mã chỉ dùng một lần.', 'Unable to complete this action. Check your verification code and retry. Each code can be used once.'));
      }
    } finally { setBusy(false); }
  }
  function cancelReauthentication() { pendingAction.current = null; setReauthenticate(false); }
  function resumeAfterReauthentication(verified: AuthSession, actionCode?: string) {
    const pending = pendingAction.current, current = getAuthSession();
    pendingAction.current = null; setReauthenticate(false);
    if (!pending || !current || current.user.id !== pending.expected.user.id || current.refreshToken !== pending.expected.refreshToken || verified.user.id !== pending.expected.user.id || verified.mfaRequired) {
      setError(t('Phiên đăng nhập đã thay đổi. Vui lòng thực hiện lại thao tác.', 'Your sign-in session changed. Please try the action again.')); return false;
    }
    if (pending.requiresCode && !actionCode) return false;
    setAuthSession(verified);
    void run(pending.execute, true, pending.requiresCode, actionCode);
    return true;
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
    {reauthenticate && session && <MfaReauthentication user={session.user} actionCodeRequired={pendingAction.current?.requiresCode} onComplete={resumeAfterReauthentication} onCancel={cancelReauthentication} />}
    <h2>{t('Xác thực hai bước', 'Two-factor authentication')}</h2>
    {error && <p role="alert" className="mfa-error"><SystemText message={error} /></p>}
    {notice && <p role="status"><SystemText message={notice} /></p>}
    {!status ? <button disabled={busy} onClick={() => void run(async () => setStatus(await mfaService.status()))}>{t('Tải lại trạng thái', 'Reload status')}</button>
      : !status.available ? <p>{t('Xác thực bằng ứng dụng chưa được cấu hình trên hệ thống.', 'Authenticator verification has not been configured on this system.')}</p>
      : <><p>{status.enabled ? t('Đã bật xác thực bằng ứng dụng.', 'Authenticator verification is enabled.') : t('Chưa bật xác thực bằng ứng dụng.', 'Authenticator verification is disabled.')}</p>
        <p className="mfa-settings__hint">{t('Bảo vệ tài khoản bằng mã từ ứng dụng xác thực. Hệ thống chỉ yêu cầu xác minh lại khi cần thay đổi bảo mật. Mỗi mã chỉ dùng một lần.', 'Protect your account with an authenticator app. Verification is requested only when needed for security changes. Each code can be used once.')}</p>
        <div className="mfa-actions">
        {!status.enabled && !enrollment && <button className="mfa-primary" disabled={busy} onClick={() => void run(async () => { setRecoveryCodes([]); setEnrollment(await mfaService.enroll()); })}>{t('Thiết lập ứng dụng xác thực', 'Set up authenticator')}</button>}
        </div>
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
            <button disabled={busy || !code.trim()} onClick={() => void run(async freshCode => {
              const result = await mfaService.recoveryCodes(freshCode ?? code.trim());
              setAuthSession(result.session); setRecoveryCodes(result.recoveryCodes); setCode(''); setStatus(await mfaService.status());
            }, false, true)}>{t('Tạo lại mã khôi phục', 'Replace recovery codes')}</button>
            <button disabled={busy || !code.trim()} onClick={() => void run(async freshCode => {
              await mfaService.disable(freshCode ?? code.trim()); clearAuthSession(); navigate('/login', { replace: true });
            }, false, true)}>{t('Tắt xác thực hai bước', 'Disable two-factor authentication')}</button>
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
