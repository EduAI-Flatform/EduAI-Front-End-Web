import { useSyncExternalStore } from "react";
import {
  AuthSession,
  getAuthSession,
  saveAuthSession,
} from "../../services/auth.service";

const listeners = new Set<() => void>();

let currentSession: AuthSession | null = getAuthSession();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  function handleStorage() {
    currentSession = getAuthSession();
    listener();
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot() {
  return currentSession;
}

export function setAuthSession(session: AuthSession) {
  currentSession = session;
  saveAuthSession(session);
  emitChange();
}

export function clearAuthSession() {
  currentSession = null;
  window.localStorage.removeItem("eduai.auth.session.v1");
  emitChange();
}

export function useAuthSession() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
