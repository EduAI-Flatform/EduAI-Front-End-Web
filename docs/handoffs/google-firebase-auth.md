# Google Firebase Auth Handoff

- Firebase client config lives in `src/lib/firebase.ts` and is read only from Vite `VITE_FIREBASE_*` variables.
- `authService.loginWithGoogle()` uses Firebase `signInWithPopup`, obtains `user.getIdToken()`, and exchanges only that token at `/auth/firebase`.
- The backend `AuthSession` remains the source of truth for the application user and is persisted through the existing auth store/localStorage flow.
- Login and registration both render the shared Google button with the multicolor Google G icon; the old LinkedIn placeholder was removed.
- Logout invalidates the backend refresh token when available, signs out Firebase, then clears the existing local auth state.
- The frontend assumes the deployed backend exposes `POST /api/v1/auth/firebase` and returns the existing `{ success, data, message }` envelope with an `AuthSession`.
- Configure Google as a Firebase provider and add each deployed frontend domain to Firebase Authentication authorized domains.
