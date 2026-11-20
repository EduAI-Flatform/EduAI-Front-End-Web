import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Modal } from '../../components/ui/modal';
import { authService, type AuthSession, type AuthUser, type OAuthProviderCapabilities, type SocialOAuthProvider } from '../../services/auth.service';
import { mfaService } from '../../services/mfa.service';
import { usePlatform } from '../platform/PlatformProvider';

/** A fresh login stays private to this dialog until its account and MFA are proven. */
export function MfaReauthentication({ user, onComplete, onCancel, actionCodeRequired = false }: {
  user: Pick<AuthUser, 'id' | 'email'>; onComplete: (session: AuthSession, actionCode?: string) => boolean | void; onCancel: () => void; actionCodeRequired?: boolean;
}) {
  const { t } = usePlatform();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [candidate, setCandidate] = useState<AuthSession | null>(null);
  const [actionSession, setActionSession] = useState<AuthSession | null>(null);
  const consumedCode = useRef('');
  const [providers, setProviders] = useState<OAuthProviderCapabilities>({ google: false, facebook: false, zalo: false });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const active = useRef(true), pending = useRef(false), staged = useRef<AuthSession | null>(null);
  useEffect(() => {
    active.current = true;
    authService.getOAuthProviders().then(value => { if (active.current) setProviders(value); }).catch(() => undefined);
    return () => { active.current = false; discard(staged.current); staged.current = null; };
  }, []);
  function discard(session: AuthSession | null) {
    if (session) void authService.discardSession?.(session.refreshToken).catch(() => undefined);
  }
  function accept(session: AuthSession) {
    if (!active.current) { discard(session); return; }
    if (session.user.id !== user.id) {
      discard(session);
      throw new Error('ACCOUNT_MISMATCH');
    }
    if (session.mfaRequired) { staged.current = session; setCandidate(session); return; }
    if (actionCodeRequired) {
      staged.current = session; setActionSession(session); setCandidate(null); setCode(''); return;
    }
    finish(session);
  }
  function finish(session: AuthSession, actionCode?: string) {
    staged.current = null;
    setPassword(''); setCode('');
    if (onComplete(session, actionCode) === false) discard(session);
  }
  async function perform(login: () => Promise<AuthSession>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { accept(await login()); }
    catch (failure) {
      if (active.current) setError(failure instanceof Error && failure.message === 'ACCOUNT_MISMATCH'
        ? t('Vui lòng xác minh đúng tài khoản đang sử dụng.', 'Verify the account you are currently using.')
        : t('Chưa xác minh được. Kiểm tra thông tin hoặc thử lại.', 'Verification failed. Check your details or try again.'));
    } finally { pending.current = false; if (active.current) { setBusy(false); setPassword(''); } }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (actionSession) {
      if (code.trim() === consumedCode.current) {
        setError(t('Mã này đã được dùng để xác minh. Hãy đợi mã mới hoặc dùng mã khôi phục khác.', 'This code was used for verification. Wait for a new code or use another recovery code.')); return;
      }
      finish(actionSession, code.trim()); return;
    }
    void perform(async () => {
      if (!candidate) return authService.login({ email: user.email, password });
      const verified = await mfaService.verifySession(candidate.accessToken, code.trim());
      consumedCode.current = code.trim();
      return verified;
    });
  }
  function social(provider: SocialOAuthProvider) {
    void perform(async () => {
      const launch = authService.startSocialOAuth(provider, { mode: 'login', popupOnly: true });
      if (!launch || launch.kind !== 'popup') throw new Error('POPUP_UNAVAILABLE');
      const result = await launch.completion;
      if (result.kind !== 'session') throw new Error('ACCOUNT_MISMATCH');
      return result.session;
    });
  }
  return <Modal open onOpenChange={open => { if (!open) onCancel(); }}
    title={t('Xác minh để tiếp tục', 'Verify to continue')}
    description={t('Chỉ cần xác minh lại khi thay đổi bảo mật và lần đăng nhập gần nhất đã quá 5 phút. Bạn vẫn ở trang này.', 'Security changes need verification when your last sign-in was over five minutes ago. You will stay on this page.')}
    className="mfa-reauthentication">
    <p className="mfa-reauthentication__account">{user.email}</p>
    <form onSubmit={submit}>
      {actionSession ? <>
        <p>{t('Đã xác minh tài khoản. Nhập mã mới để hoàn tất thao tác bảo mật đã chọn. Mã xác minh vừa dùng không thể sử dụng lại.', 'Your account is verified. Enter a fresh code to finish the selected security action. The verification code cannot be reused.')}</p>
        <label htmlFor="mfa-action-code">{t('Mã mới cho thao tác bảo mật', 'Fresh code for this security action')}</label>
        <input id="mfa-action-code" autoFocus autoComplete="one-time-code" maxLength={27} required value={code} disabled={busy} onChange={event => setCode(event.target.value)} />
      </> : candidate ? <>
        <p>{t('Hoàn tất xác thực hai bước cho lần xác minh này.', 'Complete two-factor verification for this sign-in.')}</p>
        <label htmlFor="mfa-reauth-code">{t('Mã xác thực hoặc mã khôi phục', 'Authenticator or recovery code')}</label>
        <input id="mfa-reauth-code" autoFocus autoComplete="one-time-code" maxLength={27} required value={code} disabled={busy} onChange={event => setCode(event.target.value)} />
      </> : <>
        <label htmlFor="mfa-reauth-password">{t('Mật khẩu', 'Password')}</label>
        <input id="mfa-reauth-password" type="password" autoComplete="current-password" required value={password} disabled={busy} onChange={event => setPassword(event.target.value)} />
      </>}
      {error && <p role="alert" className="mfa-error">{error}</p>}
      <div className="mfa-actions">
        <button type="submit" className="mfa-primary" disabled={busy}>{busy ? t('Đang xác minh…', 'Verifying…') : t('Xác minh và tiếp tục', 'Verify and continue')}</button>
        <button type="button" onClick={onCancel}>{t('Hủy', 'Cancel')}</button>
      </div>
    </form>
    {!candidate && !actionSession && <div className="mfa-reauthentication__providers">
      {providers.google && <button type="button" disabled={busy} onClick={() => void perform(() => authService.reauthenticateWithGoogle())}>{t('Tiếp tục với Google', 'Continue with Google')}</button>}
      {providers.facebook && <button type="button" disabled={busy} onClick={() => social('facebook')}>{t('Tiếp tục với Facebook', 'Continue with Facebook')}</button>}
      {providers.zalo && <button type="button" disabled={busy} onClick={() => social('zalo')}>{t('Tiếp tục với Zalo', 'Continue with Zalo')}</button>}
    </div>}
  </Modal>;
}