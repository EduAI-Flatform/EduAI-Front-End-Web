/** A browser-wide mutex; records contain only coordination IDs, never credentials. */
export async function withRefreshLock<T>(work: (ownsLock: () => Promise<boolean>) => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("gds-auth-refresh", () => work(async () => true));
  }
  // IndexedDB read/write transactions serialize lock acquisition in browsers
  // without Web Locks. A lease recovers when a tab crashes or closes.
  if (typeof indexedDB === "undefined") return work(async () => true);
  const database = await openCoordinationDatabase();
  const owner = crypto.randomUUID();
  const deadline = Date.now() + 35_000;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  try {
    while (!await updateLease(database, owner, false)) {
      if (Date.now() >= deadline) throw new Error("AUTH_REFRESH_COORDINATION_TIMEOUT");
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    heartbeat = setInterval(() => {
      void updateLease(database, owner, false).catch(() => undefined);
    }, 5_000);
    return await work(() => updateLease(database, owner, false));
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    await updateLease(database, owner, true).catch(() => undefined);
    database.close();
  }
}

function openCoordinationDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("gds-auth-coordination", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("locks");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("AUTH_REFRESH_COORDINATION_UNAVAILABLE"));
    request.onblocked = () => reject(new Error("AUTH_REFRESH_COORDINATION_UNAVAILABLE"));
  });
}

function updateLease(database: IDBDatabase, owner: string, release: boolean): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let granted = false;
    const transaction = database.transaction("locks", "readwrite");
    const store = transaction.objectStore("locks");
    const request = store.get("refresh");
    request.onsuccess = () => {
      const lease = request.result as { owner: string; expiresAt: number } | undefined;
      if (release) {
        if (lease?.owner === owner) store.delete("refresh");
      } else if (!lease || lease.owner === owner || lease.expiresAt <= Date.now()) {
        store.put({ owner, expiresAt: Date.now() + 30_000 }, "refresh");
        granted = true;
      }
    };
    transaction.oncomplete = () => resolve(granted);
    transaction.onerror = transaction.onabort = () => reject(new Error("AUTH_REFRESH_COORDINATION_UNAVAILABLE"));
  });
}
