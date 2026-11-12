import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { getConfiguredFirebaseAuth, signOutFirebase } from '../lib/firebase';
import { ApiClient } from './api-client';
import { getAuthSession } from './auth.service';

export interface AccountSecurityCapabilities { passwordMode: 'local' | 'firebase' | 'external'; firebaseUid: string | null; }
const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });
export const accountSecurityService = {
  capabilities: () => client.get<AccountSecurityCapabilities>('/auth/security'),
  async changePassword(capabilities: AccountSecurityCapabilities, currentPassword: string, newPassword: string) {
    if (capabilities.passwordMode === 'local') {
      await client.post('/auth/security/password', { currentPassword, newPassword });
      return;
    }
    const firebaseUser = getConfiguredFirebaseAuth().currentUser;
    if (capabilities.passwordMode !== 'firebase' || !firebaseUser || firebaseUser.uid !== capabilities.firebaseUid
      || !firebaseUser.email || !firebaseUser.providerData.some(provider => provider.providerId === 'password')) {
      throw new Error('PASSWORD_PROVIDER_REAUTHENTICATION_REQUIRED');
    }
    await reauthenticateWithCredential(firebaseUser, EmailAuthProvider.credential(firebaseUser.email, currentPassword));
    await updatePassword(firebaseUser, newPassword);
    const idToken = await firebaseUser.getIdToken(true);
    try { await client.post('/auth/security/firebase-password-sessions', { idToken }); }
    catch { throw new Error('PASSWORD_CHANGED_SESSION_REVOCATION_PENDING'); }
    finally { await signOutFirebase(); }
  },
};
