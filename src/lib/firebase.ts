import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  initializeAuth,
  signOut,
  type Auth,
} from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredConfigEntries = [
  ["VITE_FIREBASE_API_KEY", firebaseConfig.apiKey],
  ["VITE_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
  ["VITE_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
  ["VITE_FIREBASE_STORAGE_BUCKET", firebaseConfig.storageBucket],
  ["VITE_FIREBASE_MESSAGING_SENDER_ID", firebaseConfig.messagingSenderId],
  ["VITE_FIREBASE_APP_ID", firebaseConfig.appId],
] as const;

const missingConfigKeys = requiredConfigEntries
  .filter(([, value]) => !value?.trim())
  .map(([key]) => key);

export const firebaseConfigError = missingConfigKeys.length
  ? `Thiếu cấu hình Firebase: ${missingConfigKeys.join(", ")}.`
  : null;

const firebaseApp = firebaseConfigError ? null : initializeApp(firebaseConfig);

// Keep Firebase optional at module load so email/password auth still works when
// a deployment has not configured Google authentication yet. The redirect
// resolver is intentionally not used by this application: Firebase's browser
// redirect resolver stores its pending event in sessionStorage, which is not
// stable across mobile app/browser context changes. Popup auth returns through
// the initiating page and keeps Firebase's OAuth state validation intact.
export const auth: Auth | null = firebaseApp
  ? initializeFirebaseAuth(firebaseApp)
  : null;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

function initializeFirebaseAuth(app: Parameters<typeof initializeAuth>[0]): Auth {
  const dependencies: Parameters<typeof initializeAuth>[1] = {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  };

  // The Node Firebase entry point exports an error sentinel for the browser
  // popup resolver. Vite uses the browser entry point in production, while
  // this guard keeps SSR/jsdom module loading from failing before a user acts.
  if (isBrowserPopupRedirectResolver(browserPopupRedirectResolver)) {
    dependencies.popupRedirectResolver = browserPopupRedirectResolver;
  }

  return initializeAuth(app, dependencies);
}

function isBrowserPopupRedirectResolver(
  value: unknown,
): value is typeof browserPopupRedirectResolver {
  return (
    typeof value === "object" &&
    value !== null &&
    !("code" in value)
  );
}

export function getConfiguredFirebaseAuth(): Auth {
  if (!auth) {
    throw new Error(
      firebaseConfigError ??
        "Cấu hình Firebase chưa sẵn sàng. Vui lòng thử lại sau.",
    );
  }

  return auth;
}

export async function signOutFirebase(): Promise<void> {
  if (!auth) {
    return;
  }

  try {
    await signOut(auth);
  } catch {
    // Local/backend logout must not be blocked by a Firebase cleanup failure.
  }
}
