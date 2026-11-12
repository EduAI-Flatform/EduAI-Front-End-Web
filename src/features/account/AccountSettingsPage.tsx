import { SystemText } from '@/features/platform/SystemText';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession } from '../auth/auth-store';
import { MfaSettings } from '../auth/MfaSettings';
import { usePlatform } from '../platform/PlatformProvider';
import { accountSecurityService, type AccountSecurityCapabilities } from '../../services/account-security.service';
import './AccountPages.css';

export function AccountSettingsPage() {
  const { t, locale, setLocale } = usePlatform();
  const navigate = useNavigate();
  const [capabilities, setCapabilities] = useState<AccountSecurityCapabilities | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    accountSecurityService.capabilities().then(value => { if (active) setCapabilities(value); }).catch(() => { if (active) setError(t('Không tải được thiết lập bảo mật.', 'Unable to load security settings.')); });
    return () => { active = false; };
  }, [locale]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!capabilities || busy) return;
    const form = event.currentTarget, data = new FormData(form);
    const currentPassword = String(data.get('currentPassword') ?? '');
    const newPassword = String(data.get('newPassword') ?? '');
    if (newPassword !== data.get('confirmPassword')) { setError(t('Mật khẩu xác nhận không khớp.', 'Password confirmation does not match.')); return; }
    if (new TextEncoder().encode(newPassword).byteLength > 72) { setError(t('Mật khẩu tối đa 72 byte UTF-8.', 'Password must fit within 72 UTF-8 bytes.')); return; }
    setBusy(true); setError('');
    try {
      await accountSecurityService.changePassword(capabilities, currentPassword, newPassword);
      form.reset(); clearAuthSession(); navigate('/login', { replace: true });
    } catch (reason) {
      if (reason instanceof Error && reason.message === 'PASSWORD_CHANGED_SESSION_REVOCATION_PENDING') {
        clearAuthSession();
        navigate('/login', { replace: true, state: { accountNotice: t('Mật khẩu đã đổi. Hãy đăng nhập lại. Việc thu hồi các phiên GDS khác chưa hoàn tất.', 'Password changed. Sign in again. Revoking other GDS sessions has not completed.') } });
      } else setError(t('Không đổi được mật khẩu. Kiểm tra mật khẩu hiện tại hoặc đăng nhập lại bằng tài khoản quản lý mật khẩu của bạn.', 'Unable to change password. Check your current password or sign in again with your password provider.'));
    }
    finally { setBusy(false); }
  }
  return <section className="account-page container">
    <header><h1>{t('Cài đặt', 'Settings')}</h1></header>
    <section className="account-panel"><h2>{t('Thiết lập', 'Preferences')}</h2>
      <label>{t('Ngôn ngữ giao diện', 'Interface language')}<select value={locale} onChange={event => setLocale(event.target.value as 'vi' | 'en')}><option value="vi"><SystemText message={"Tiếng Việt"} /></option><option value="en">English</option></select></label>
    </section>
    <section className="account-panel"><h2>{t('Đổi mật khẩu', 'Change password')}</h2>
      {!capabilities && !error && <p role="status">{t('Đang tải…', 'Loading…')}</p>}
      {error && <p role="alert"><SystemText message={error} /></p>}
      {capabilities?.passwordMode === 'external' ? <p>{t('Mật khẩu được quản lý tại nhà cung cấp đăng nhập của bạn.', 'Your sign-in provider manages your password.')}</p>
        : capabilities && <form onSubmit={submit}>
          <label>{t('Mật khẩu hiện tại', 'Current password')}<input type="password" name="currentPassword" autoComplete="current-password" required minLength={8} maxLength={128} disabled={busy} /></label>
          <label>{t('Mật khẩu mới', 'New password')}<input type="password" name="newPassword" autoComplete="new-password" required minLength={8} maxLength={72} disabled={busy} /></label>
          <label>{t('Xác nhận mật khẩu mới', 'Confirm new password')}<input type="password" name="confirmPassword" autoComplete="new-password" required minLength={8} maxLength={72} disabled={busy} /></label>
          <p>{t('Sau khi lưu, bạn cần đăng nhập lại trên các thiết bị.', 'After saving, sign in again on your devices.')}</p>
          <button type="submit" disabled={busy}>{busy ? t('Đang lưu…', 'Saving…') : t('Đổi mật khẩu', 'Change password')}</button>
        </form>}
    </section>
    <MfaSettings />
  </section>;
}
