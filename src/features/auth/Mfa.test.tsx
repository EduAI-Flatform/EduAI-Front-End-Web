import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MfaChallengePage } from './MfaChallengePage';
import { MfaSettings } from './MfaSettings';
import { ApiClientError } from '../../services/api-client';
const mocks = vi.hoisted(() => ({
  session: { mfaRequired: true, refreshToken: 'synthetic-refresh', user: { id: 'owner', email: 'owner@example.test', roles: ['student'] } },
  login: vi.fn(), setSession: vi.fn(), clear: vi.fn(), navigate: vi.fn(),
  status: vi.fn(), enroll: vi.fn(), confirm: vi.fn(), verify: vi.fn(), disable: vi.fn(), recoveryCodes: vi.fn(),
}));
vi.mock('./auth-store', () => ({ useAuthSession: () => mocks.session, setAuthSession: mocks.setSession, clearAuthSession: mocks.clear }));
vi.mock('../../services/mfa.service', () => ({ mfaService: { status: mocks.status, enroll: mocks.enroll, confirm: mocks.confirm, verify: mocks.verify, disable: mocks.disable, recoveryCodes: mocks.recoveryCodes } }));
vi.mock('../../services/auth.service', () => ({ authService: { logout: vi.fn(), login: mocks.login, getOAuthProviders: async () => ({ google: false, facebook: false, zalo: false }) }, getAuthSession: () => mocks.session, getDefaultRouteForRoles: () => '/dashboard' }));
vi.mock('react-router-dom', async () => ({ ...await vi.importActual('react-router-dom'), useNavigate: () => mocks.navigate }));
describe('MFA screens', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.status.mockResolvedValue({ available: true, enabled: false, recoveryCodesRemaining: 0 });
  });
  it('verifies a provisional session before redirecting to the requested local destination', async () => {
    const verified = { ...mocks.session, mfaRequired: false };
    mocks.verify.mockResolvedValue(verified);
    render(<MemoryRouter initialEntries={['/auth/mfa?redirectTo=%2Fdashboard%2Fprofile']}><MfaChallengePage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Mã xác thực hoặc mã khôi phục'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => expect(mocks.setSession).toHaveBeenCalledWith(verified));
    expect(mocks.navigate).toHaveBeenCalledWith('/dashboard/profile', { replace: true });
  });
  it('keeps the provisional session when the code fails and shows a labeled error', async () => {
    mocks.verify.mockRejectedValue(new Error('invalid'));
    render(<MemoryRouter><MfaChallengePage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Mã xác thực hoặc mã khôi phục'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await screen.findByRole('alert');
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Mã xác thực hoặc mã khôi phục')).toHaveAttribute('aria-invalid', 'true');
  });
  it('does not expose setup controls until server encryption readiness is available', async () => {
    mocks.status.mockResolvedValue({ available: false, enabled: false, recoveryCodesRemaining: 0 });
    render(<MemoryRouter><MfaSettings /></MemoryRouter>);
    await screen.findByText('Xác thực bằng ứng dụng chưa được cấu hình trên hệ thống.');
    expect(screen.queryByRole('button', { name: 'Thiết lập ứng dụng xác thực' })).not.toBeInTheDocument();
  });
  it('opens inline verification only for an explicit stale-primary error and resumes once', async () => {
    mocks.enroll.mockRejectedValueOnce(new ApiClientError('Verify again', 'MFA_REAUTHENTICATION_REQUIRED', 401))
      .mockResolvedValueOnce({ secret: 'key', otpauthUri: 'otpauth://totp/test', expiresAt: '2026-11-20' });
    const fresh = { ...mocks.session, mfaRequired: false };
    mocks.login.mockResolvedValue(fresh);
    render(<MemoryRouter><MfaSettings /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Thiết lập ứng dụng xác thực' }));
    fireEvent.change(await screen.findByLabelText('Mật khẩu'), { target: { value: 'private-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác minh và tiếp tục' }));
    await screen.findByRole('button', { name: 'Hiện khóa thiết lập' });
    expect(mocks.enroll).toHaveBeenCalledTimes(2);
    expect(mocks.setSession).toHaveBeenCalledWith(fresh);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('keeps setup and the current session unchanged when inline verification is canceled', async () => {
    mocks.enroll.mockRejectedValue(new ApiClientError('Verify again', 'MFA_REAUTHENTICATION_REQUIRED', 401));
    render(<MemoryRouter><MfaSettings /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Thiết lập ứng dụng xác thực' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Hủy' }));
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.enroll).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('uses the new action code after verifying stale recovery-code replacement', async () => {
    mocks.status.mockResolvedValue({ available: true, enabled: true, recoveryCodesRemaining: 4 });
    mocks.recoveryCodes.mockRejectedValueOnce(new ApiClientError('Verify again', 'MFA_REAUTHENTICATION_REQUIRED', 401))
      .mockResolvedValueOnce({ session: { ...mocks.session, mfaRequired: false }, recoveryCodes: ['NEW-CODE'] });
    mocks.login.mockResolvedValue({ ...mocks.session, mfaRequired: false });
    render(<MemoryRouter><MfaSettings /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('Mã xác thực mới hoặc mã khôi phục'), { target: { value: '111111' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo lại mã khôi phục' }));
    fireEvent.change(await screen.findByLabelText('Mật khẩu'), { target: { value: 'private-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác minh và tiếp tục' }));
    fireEvent.change(await screen.findByLabelText('Mã mới cho thao tác bảo mật'), { target: { value: '222222' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác minh và tiếp tục' }));
    await screen.findByText('NEW-CODE');
    expect(mocks.recoveryCodes.mock.calls.map(call => call[0])).toEqual(['111111', '222222']);
  });
  it('keeps the setup key concealed until requested and shows recovery codes only after confirmation', async () => {
    mocks.enroll.mockResolvedValue({ secret: 'SYNTHETICSETUPKEY', otpauthUri: 'otpauth://totp/test', expiresAt: '2026-11-11' });
    mocks.confirm.mockResolvedValue({ session: { mfaRequired: false }, recoveryCodes: ['AAAAAA-BBBBBB-CCCCCC-DDDDDD'] });
    render(<MemoryRouter><MfaSettings /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Thiết lập ứng dụng xác thực' }));
    await screen.findByRole('button', { name: 'Hiện khóa thiết lập' });
    expect(screen.queryByText('SYNTHETICSETUPKEY')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hiện khóa thiết lập' }));
    expect(screen.getByText('SYNTHETICSETUPKEY')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mã 6 chữ số'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kích hoạt' }));
    await screen.findByText('AAAAAA-BBBBBB-CCCCCC-DDDDDD');
    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã lưu mã' }));
    expect(screen.queryByText('AAAAAA-BBBBBB-CCCCCC-DDDDDD')).not.toBeInTheDocument();
  });
});
