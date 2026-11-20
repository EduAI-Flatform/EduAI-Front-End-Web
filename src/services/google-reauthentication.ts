import { deleteApp, initializeApp } from 'firebase/app';
import { browserPopupRedirectResolver, inMemoryPersistence, initializeAuth, signInWithPopup, signOut } from 'firebase/auth';
import { getConfiguredFirebaseAuth, googleProvider } from '../lib/firebase';
import { ApiClient } from './api-client';
import type { AuthSession } from './auth.service';

/** Isolate reauthentication from the default Firebase user's persisted state.
 * https://firebase.google.com/docs/reference/js/auth#initializeauth
 */
export async function googleReauthentication(): Promise<AuthSession> {
  const primary = getConfiguredFirebaseAuth();
  const app = initializeApp(primary.app.options, `gds-reauth-${crypto.randomUUID()}`);
  const auth = initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return await new ApiClient().post<AuthSession>('/auth/firebase', { idToken });
  } finally {
    if (auth) await signOut(auth).catch(() => undefined);
    await deleteApp(app).catch(() => undefined);
  }
}