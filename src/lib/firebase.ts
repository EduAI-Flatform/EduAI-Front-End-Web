import { initializeApp } from "firebase/app";
import {
  getAuth,
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

// getAuth uses Firebase's supported browser defaults for persistence and the
// popup/redirect resolver. The application selects popup versus redirect at
// the call site; it does not need a bespoke Auth dependency graph.
export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

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
