# Google Firebase Auth Handoff

- Firebase client config lives in `src/lib/firebase.ts` and is read only from Vite `VITE_FIREBASE_*` variables.
- `authService.loginWithGoogle()` uses Firebase `signInWithPopup`, obtains `user.getIdToken()`, and exchanges only that token at `/auth/firebase`.
- Google sign-in uses the same popup path on mobile and desktop top-level browsers; the full-page Firebase redirect flow is intentionally not used because its pending event is stored in browser `sessionStorage`.
- Firebase Auth is initialized with IndexedDB/local persistence only. If an in-app browser (Zalo, Facebook, Messenger, or Android WebView) cannot return a popup to the initiating page, the UI keeps the user in EduAI and offers a normal-browser reopen, retry, and home action.
- New Google users receive `ACCOUNT_ROLE_REQUIRED`; the login page keeps the Firebase ID token in memory, asks for `student` or `instructor`, then retries account creation with the selected role.
- Google OAuth sends `prompt=select_account` so the account chooser is shown even when the browser has an active Google session.
- The backend `AuthSession` remains the source of truth for the application user and is persisted through the existing auth store/localStorage flow.
- Login and registration both render the shared Google button with the multicolor Google G icon; the old LinkedIn placeholder was removed.
- Logout invalidates the backend refresh token when available, signs out Firebase, then clears the existing local auth state.
- The frontend assumes the deployed backend exposes `POST /api/v1/auth/firebase` and returns the existing `{ success, data, message }` envelope with an `AuthSession`.
- Configure Google as a Firebase provider and add each deployed frontend domain to Firebase Authentication authorized domains.
- Email/password registration uses Firebase `createUserWithEmailAndPassword`, stores no password locally, updates the Firebase display name, and sends Firebase's verification email.
- `/check-email` guides unverified users and supports resend with a 60-second cooldown. The pending email, name, and selected role are kept only in `sessionStorage` so the role can be sent when the verified user first exchanges an ID token.
- Email/password login reloads the Firebase user before checking `emailVerified`; unverified users never call the backend or receive an `AuthSession`.
- The Google button on the registration page sends `mode=register` and the selected role. An existing Firebase/email match is rejected with `ACCOUNT_ALREADY_EXISTS` and the user sees a message asking them to log in instead of being silently logged in.
- `/auth/register` and `/auth/login` remain backend legacy endpoints, but the web registration/login pages no longer call them.
- Students use `/` as their post-login default route; instructors and platform administrators retain dashboard routing.
