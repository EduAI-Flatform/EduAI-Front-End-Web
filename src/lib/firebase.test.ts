import { afterEach, describe, expect, it, vi } from "vitest";

const firebaseMocks = vi.hoisted(() => ({
  browserLocalPersistence: { type: "LOCAL" },
  browserPopupRedirectResolver: { name: "popup-resolver" },
  indexedDBLocalPersistence: { type: "IDB" },
  initializeAuth: vi.fn(() => ({})),
  initializeApp: vi.fn(() => ({})),
  setCustomParameters: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("firebase/app", () => ({
  initializeApp: firebaseMocks.initializeApp,
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(function () {
    return { setCustomParameters: firebaseMocks.setCustomParameters };
  }),
  browserLocalPersistence: firebaseMocks.browserLocalPersistence,
  browserPopupRedirectResolver: firebaseMocks.browserPopupRedirectResolver,
  indexedDBLocalPersistence: firebaseMocks.indexedDBLocalPersistence,
  initializeAuth: firebaseMocks.initializeAuth,
  signOut: firebaseMocks.signOut,
}));

describe("Firebase Google provider", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("forces Google to show the account chooser", async () => {
    vi.stubEnv("VITE_FIREBASE_API_KEY", "api-key");
    vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "eduai-30bba.firebaseapp.com");
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "eduai-30bba");
    vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", "eduai-30bba.firebasestorage.app");
    vi.stubEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "sender-id");
    vi.stubEnv("VITE_FIREBASE_APP_ID", "app-id");

    await import("./firebase");

    expect(firebaseMocks.setCustomParameters).toHaveBeenCalledWith({
      prompt: "select_account",
    });
    expect(firebaseMocks.initializeAuth).toHaveBeenCalledWith(
      expect.anything(),
      {
        persistence: [
          firebaseMocks.indexedDBLocalPersistence,
          firebaseMocks.browserLocalPersistence,
        ],
        popupRedirectResolver: firebaseMocks.browserPopupRedirectResolver,
      },
    );
  });
});
