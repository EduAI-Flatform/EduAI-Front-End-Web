const AUTH_SESSION_KEY = "eduai.auth.session.v1";
const AUTH_SESSION_CHANGED_EVENT = "eduai.auth.session.changed";

export function readAuthSessionStorage(): string | null {
  return window.localStorage.getItem(AUTH_SESSION_KEY);
}

export function writeAuthSessionStorage(session: string): void {
  window.localStorage.setItem(AUTH_SESSION_KEY, session);
  notifyAuthSessionChanged();
}

export function clearAuthSessionStorage(): void {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  notifyAuthSessionChanged();
}

export function subscribeToAuthSessionStorage(listener: () => void): () => void {
  function handleStorage() {
    listener();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleStorage);
  };
}

function notifyAuthSessionChanged(): void {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}
