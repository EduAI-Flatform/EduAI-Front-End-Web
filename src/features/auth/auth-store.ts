import { useSyncExternalStore } from "react";
import {
  AuthSession,
  getAuthSession,
  saveAuthSession,
} from "../../services/auth.service";
import {
  clearAuthSessionStorage,
  subscribeToAuthSessionStorage,
} from "../../services/auth-session.storage";

const listeners = new Set<() => void>();

let currentSession: AuthSession | null = getAuthSession();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const unsubscribe = subscribeToAuthSessionStorage(() => {
    currentSession = getAuthSession();
    listener();
  });

  return () => {
    listeners.delete(listener);
    unsubscribe();
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
  clearAuthSessionStorage();
  emitChange();
}

export function useAuthSession() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
