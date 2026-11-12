import { SystemText } from '@/features/platform/SystemText';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GdsBrand } from '../../components/brand/GdsBrand';
import { authService, getDefaultRouteForRoles } from '../../services/auth.service';
import { mfaService } from '../../services/mfa.service';
import { usePlatform } from '../platform/PlatformProvider';
import { clearAuthSession, setAuthSession, useAuthSession } from './auth-store';
import './Mfa.css';
export function MfaChallengePage() {
  const { t } = usePlatform();
  const session = useAuthSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!session) return <Navigate to="/login" replace />;
  const requested = new URLSearchParams(location.search).get('redirectTo');
  const destination = requested && /^\/(?!\/)[A-Za-z0-9/_?=&.%#:+-]*$/.test(requested) && !/%5c/i.test(requested) && !requested.startsWith('/auth/') ? requested : getDefaultRouteForRoles(session.user.roles);
  if (!session.mfaRequired) return <Navigate to={destination} replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const verified = await mfaService.verify(code.trim());
      setAuthSession(verified); setCode(''); navigate(destination, { replace: true });
    } catch {
      setError(t('Không thể xác thực. Kiểm tra mã hoặc đăng nhập lại nếu phiên đã hết hạn.', 'Verification failed. Check your code or sign in again if your session expired.'));
    } finally { setBusy(false); }
  }
  async function logout() {
    const token = session?.refreshToken;
    clearAuthSession();
    try { await authService.logout(token); } catch { /* Local session has already been cleared. */ }
    navigate('/login', { replace: true });
  }
  return <main className="mfa-challenge">
    <section className="mfa-panel">
      <GdsBrand />
      <h1>{t('Xác thực hai bước', 'Two-factor verification')}</h1>
      <p>{t('Nhập mã 6 chữ số từ ứng dụng xác thực hoặc một mã khôi phục chưa sử dụng.', 'Enter the six-digit code from your authenticator or an unused recovery code.')}</p>
      <form onSubmit={submit}>
        <label htmlFor="mfa-code">{t('Mã xác thực hoặc mã khôi phục', 'Authenticator or recovery code')}</label>
        <input id="mfa-code" autoFocus autoComplete="one-time-code" value={code} maxLength={27} required onChange={event => setCode(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? 'mfa-error' : undefined} />
        {error && <p id="mfa-error" role="alert" className="mfa-error"><SystemText message={error} /></p>}
        <button className="mfa-primary" disabled={busy} type="submit">{busy ? t('Đang xác thực…', 'Verifying…') : t('Xác nhận', 'Verify')}</button>
      </form>
      <button disabled={busy} onClick={() => void logout()} type="button">{t('Đăng xuất', 'Sign out')}</button>
    </section>
  </main>;
}
