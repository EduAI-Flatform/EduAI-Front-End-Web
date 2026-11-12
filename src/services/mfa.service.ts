import { ApiClient } from './api-client';
import { getAuthSession, type AuthSession } from './auth.service';
const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });
export interface MfaStatus { available: boolean; enabled: boolean; recoveryCodesRemaining: number; }
export interface MfaEnrollment { secret: string; otpauthUri: string; expiresAt: string; }
export interface MfaActivation { session: AuthSession; recoveryCodes: string[]; }
export const mfaService = {
  status: () => client.get<MfaStatus>('/auth/mfa/status'),
  enroll: () => client.post<MfaEnrollment>('/auth/mfa/enroll'),
  confirm: (code: string) => client.post<MfaActivation>('/auth/mfa/confirm', { code }),
  verify: (code: string) => client.post<AuthSession>('/auth/mfa/verify', { code }),
  disable: (code: string) => client.post<{ disabled: true }>('/auth/mfa/disable', { code }),
  recoveryCodes: (code: string) => client.post<MfaActivation>('/auth/mfa/recovery-codes', { code }),
};
