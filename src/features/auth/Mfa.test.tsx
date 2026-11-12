import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MfaChallengePage } from './MfaChallengePage';
import { MfaSettings } from './MfaSettings';
const mocks = vi.hoisted(() => ({
  session: { mfaRequired: true, refreshToken: 'synthetic-refresh', user: { roles: ['student'] } },
  setSession: vi.fn(), clear: vi.fn(), navigate: vi.fn(),
  status: vi.fn(), enroll: vi.fn(), confirm: vi.fn(), verify: vi.fn(), disable: vi.fn(), recoveryCodes: vi.fn(),
}));
vi.mock('./auth-store', () => ({ useAuthSession: () => mocks.session, setAuthSession: mocks.setSession, clearAuthSession: mocks.clear }));
vi.mock('../../services/mfa.service', () => ({ mfaService: { status: mocks.status, enroll: mocks.enroll, confirm: mocks.confirm, verify: mocks.verify, disable: mocks.disable, recoveryCodes: mocks.recoveryCodes } }));
vi.mock('../../services/auth.service', () => ({ authService: { logout: vi.fn() }, getDefaultRouteForRoles: () => '/dashboard' }));
vi.mock('react-router-dom', async () => ({ ...await vi.importActual('react-router-dom'), useNavigate: () => mocks.navigate }));
describe('MFA screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
