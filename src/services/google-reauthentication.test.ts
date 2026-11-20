import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ initializeApp: vi.fn(), deleteApp: vi.fn(), initializeAuth: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), primary: { app: { options: { projectId: 'synthetic' } } }, provider: { providerId: 'google.com' } }));
vi.mock('firebase/app', () => ({ initializeApp: mocks.initializeApp, deleteApp: mocks.deleteApp }));
vi.mock('firebase/auth', () => ({ initializeAuth: mocks.initializeAuth, signInWithPopup: mocks.signIn, signOut: mocks.signOut, inMemoryPersistence: 'memory', browserPopupRedirectResolver: 'popup' }));
vi.mock('../lib/firebase', () => ({ getConfiguredFirebaseAuth: () => mocks.primary, googleProvider: mocks.provider }));
import { googleReauthentication } from './google-reauthentication';
describe('isolated Google reauthentication', () => {
  const app = { name: 'isolated' }, isolated = { name: 'isolated-auth' };
  beforeEach(() => {
    vi.clearAllMocks(); mocks.initializeApp.mockReturnValue(app); mocks.initializeAuth.mockReturnValue(isolated);
    mocks.signOut.mockResolvedValue(undefined); mocks.deleteApp.mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllGlobals());
  it('uses in-memory auth and never signs out or changes the primary Firebase user', async () => {
    mocks.signIn.mockResolvedValue({ user: { getIdToken: async () => 'fresh-proof' } });
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { accessToken: 'candidate' } }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', request);
    await expect(googleReauthentication()).resolves.toEqual({ accessToken: 'candidate' });
    expect(mocks.initializeAuth).toHaveBeenCalledWith(app, { persistence: 'memory', popupRedirectResolver: 'popup' });
    expect(mocks.signIn).toHaveBeenCalledWith(isolated, mocks.provider);
    expect(mocks.signOut).toHaveBeenCalledWith(isolated);
    expect(mocks.signOut).not.toHaveBeenCalledWith(mocks.primary);
    expect(mocks.deleteApp).toHaveBeenCalledWith(app);
    expect(new Headers(request.mock.calls[0][1].headers).has('Authorization')).toBe(false);
  });
  it('cleans up only the isolated Firebase instance if the popup is canceled', async () => {
    mocks.signIn.mockRejectedValue(new Error('popup canceled'));
    await expect(googleReauthentication()).rejects.toThrow('popup canceled');
    expect(mocks.signOut).toHaveBeenCalledWith(isolated); expect(mocks.deleteApp).toHaveBeenCalledWith(app);
  });
});