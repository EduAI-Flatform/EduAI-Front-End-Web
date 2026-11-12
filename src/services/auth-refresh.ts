import {
  clearAuthSessionStorage,
  readAuthSessionStorage,
  writeAuthSessionStorage,
} from "./auth-session.storage";
import { withRefreshLock } from "./auth-refresh-lock";

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: { id: string };
  [key: string]: unknown;
}

const inFlight = new Map<string, Promise<string | null>>();

function readSession(): StoredSession | null {
  try {
    const value = JSON.parse(readAuthSessionStorage() ?? "null");
    return value && typeof value.accessToken === "string" && typeof value.refreshToken === "string"
      && typeof value.user?.id === "string" ? value : null;
  } catch {
    return null;
  }
}

/** Never overwrite a newer login or restore a session removed while refreshing. */
function stillCurrent(expected: StoredSession): boolean {
  const current = readSession();
  return current?.user.id === expected.user.id && current?.refreshToken === expected.refreshToken;
}

export function captureSessionOwner(accessToken: string): string | undefined {
  const session = readSession();
  return session?.accessToken === accessToken ? session.user.id : undefined;
}

export async function refreshAccessToken(baseUrl: string, rejectedToken: string, ownerId: string | undefined): Promise<string | null> {
  const expected = readSession();
  if (!ownerId || !expected || expected.user.id !== ownerId) return null;
  // A request can finish after another request already completed renewal.
  if (expected.accessToken !== rejectedToken) return expected.accessToken;
  const key = `${baseUrl}:${expected.refreshToken}`;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const renew = async (ownsLock: () => Promise<boolean>) => {
    const latest = readSession();
    if (!latest || latest.user.id !== expected.user.id) return null;
    // A preceding tab holding the Web Lock already renewed this session.
    if (latest.accessToken !== rejectedToken) return latest.accessToken;

    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken: latest.refreshToken }),
      cache: "no-store",
    });

    // A frozen tab can outlive its IndexedDB lease. Its result must never
    // revoke or overwrite the session now owned by another tab.
    if (!await ownsLock()) return null;

    if (!response.ok) {
      if ((response.status === 401 || response.status === 403) && stillCurrent(latest)) {
        clearAuthSessionStorage();
      }
      // Transient server/network failures must not destroy a valid session.
      throw new Error(response.status === 401 || response.status === 403 ? "AUTH_SESSION_EXPIRED" : "AUTH_REFRESH_UNAVAILABLE");
    }

    const result = await response.json();
    const session = result?.success === true ? result.data as StoredSession : null;
    if (!session || typeof session.accessToken !== "string" || typeof session.refreshToken !== "string"
      || session.user?.id !== latest.user.id) throw new Error("AUTH_REFRESH_INVALID_RESPONSE");
    if (!stillCurrent(latest)) return null;
    writeAuthSessionStorage(JSON.stringify(session));
    return session.accessToken;
  };

  const operation = withRefreshLock(renew);
  inFlight.set(key, operation);
  try {
    return await operation;
  } finally {
    if (inFlight.get(key) === operation) inFlight.delete(key);
  }
}
