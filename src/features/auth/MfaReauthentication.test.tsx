import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MfaReauthentication } from './MfaReauthentication';
const mocks = vi.hoisted(() => ({ login: vi.fn(), google: vi.fn(), verify: vi.fn(), complete: vi.fn(), cancel: vi.fn(), discard: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../services/auth.service', () => ({ authService: { login: mocks.login, reauthenticateWithGoogle: mocks.google, discardSession: mocks.discard, getOAuthProviders: async () => ({ google: true, facebook: false, zalo: false }) } }));
vi.mock('../../services/mfa.service', () => ({ mfaService: { verifySession: mocks.verify } }));
const owner = { id: 'owner', email: 'owner@example.test' };
const primary = { user: owner, accessToken: 'primary', refreshToken: 'refresh', mfaRequired: false };
function show() { render(<MfaReauthentication user={owner} onComplete={mocks.complete} onCancel={mocks.cancel} />); }
async function password() {
  fireEvent.change(await screen.findByLabelText('Mật khẩu'), { target: { value: 'private-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác minh và tiếp tục' }));
}
describe('inline MFA reauthentication', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns a same-account fresh session without changing the global session', async () => {
    mocks.login.mockResolvedValue(primary); show(); await password();
    await waitFor(() => expect(mocks.complete).toHaveBeenCalledWith(primary, undefined));
    expect(mocks.login).toHaveBeenCalledWith({ email: owner.email, password: 'private-password' });
  });
  it('rejects a different Google account and preserves the current session', async () => {
    mocks.google.mockResolvedValue({ ...primary, user: { ...owner, id: 'another' } }); show();
    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp tục với Google' }));
    await screen.findByRole('alert'); expect(mocks.complete).not.toHaveBeenCalled();
  });
  it('completes the staged MFA challenge before returning a session', async () => {
    mocks.login.mockResolvedValue({ ...primary, mfaRequired: true });
    mocks.verify.mockResolvedValue(primary); show(); await password();
    expect(mocks.complete).not.toHaveBeenCalled();
    fireEvent.change(await screen.findByLabelText('Mã xác thực hoặc mã khôi phục'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác minh và tiếp tục' }));
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledWith('primary', '123456'));
    await waitFor(() => expect(mocks.complete).toHaveBeenCalledWith(primary, undefined));
  });
  it('discards a staged challenge on unmount instead of installing it', async () => {
    mocks.login.mockResolvedValue({ ...primary, mfaRequired: true });
    const { unmount } = render(<MfaReauthentication user={owner} onComplete={mocks.complete} onCancel={mocks.cancel} />);
    await password(); await screen.findByLabelText('Mã xác thực hoặc mã khôi phục');
    unmount();
    expect(mocks.discard).toHaveBeenCalledWith(primary.refreshToken);
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it('discards a login that completes after the dialog has been canceled', async () => {
    let finish!: (session: typeof primary) => void;
    mocks.login.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const { unmount } = render(<MfaReauthentication user={owner} onComplete={mocks.complete} onCancel={mocks.cancel} />);
    await password(); unmount(); finish(primary);
    await waitFor(() => expect(mocks.discard).toHaveBeenCalledWith(primary.refreshToken));
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it('requires a fresh action code after MFA login and never replays the consumed proof', async () => {
    mocks.login.mockResolvedValue({ ...primary, mfaRequired: true }); mocks.verify.mockResolvedValue(primary);
    render(<MfaReauthentication user={owner} actionCodeRequired onComplete={mocks.complete} onCancel={mocks.cancel} />);
    await password();
    fireEvent.change(await screen.findByLabelText('Mã xác thực hoặc mã khôi phục'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác minh và tiếp tục' }));
    const freshCode = await screen.findByLabelText('Mã mới cho thao tác bảo mật');
    expect(mocks.complete).not.toHaveBeenCalled();
    fireEvent.change(freshCode, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác minh và tiếp tục' }));
    await screen.findByRole('alert'); expect(mocks.complete).not.toHaveBeenCalled();
    fireEvent.change(freshCode, { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác minh và tiếp tục' }));
    expect(mocks.complete).toHaveBeenCalledWith(primary, '654321');
    expect(mocks.verify).toHaveBeenCalledTimes(1);
  });
  it('can cancel after failed credentials without completing the pending action', async () => {
    mocks.login.mockRejectedValue(new Error('invalid')); show(); await password();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(mocks.cancel).toHaveBeenCalledOnce(); expect(mocks.complete).not.toHaveBeenCalled();
  });
});