import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "./api-client";
import { readAuthSessionStorage, writeAuthSessionStorage, clearAuthSessionStorage } from "./auth-session.storage";

const session = { accessToken: "old-access", refreshToken: "old-refresh", tokenType: "Bearer", expiresIn: 900, user: { id: "user-1" } };
const renewed = { ...session, accessToken: "new-access", refreshToken: "new-refresh" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(status === 200 ? { success: true, data } : { success: false, error: { code: "UNAUTHORIZED", message: "Expired" } }), { status, headers: { "Content-Type": "application/json" } });
const getAccessToken = () => JSON.parse(readAuthSessionStorage() ?? "null")?.accessToken;

describe("authenticated token renewal", () => {
  beforeEach(() => writeAuthSessionStorage(JSON.stringify(session)));
  afterEach(() => { vi.restoreAllMocks(); clearAuthSessionStorage(); });

  it.each(['/auth/me', '/auth/security', '/auth/mfa/status', '/auth/mfa/verify'])('renews protected authentication endpoint %s', async path => {
    let refreshCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      if (String(url).endsWith('/auth/refresh')) { refreshCount++; return json(renewed); }
      return new Headers(options?.headers).get('Authorization') === 'Bearer new-access' ? json({ ok: true }) : json(null, 401);
    });
    await expect(new ApiClient({ getAccessToken }).get(path)).resolves.toEqual({ ok: true });
    expect(refreshCount).toBe(1);
  });

  it("renews once for concurrent expired requests and retries both with the new token", async () => {
    let refreshCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
      if (String(url).endsWith("/auth/refresh")) { refreshCount++; return json(renewed); }
      return new Headers(options?.headers).get("Authorization") === "Bearer new-access" ? json({ ok: true }) : json(null, 401);
    });
    const client = new ApiClient({ getAccessToken });
    await expect(Promise.all([client.get("/profile"), client.get("/courses")])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(refreshCount).toBe(1);
    expect(getAccessToken()).toBe("new-access");
  });

  it("preserves the session when refresh fails temporarily", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async url => {
      if (String(url).endsWith("/auth/refresh")) throw new TypeError("offline");
      return json(null, 401);
    });
    await expect(new ApiClient({ getAccessToken }).get("/profile")).rejects.toThrow();
    expect(getAccessToken()).toBe("old-access");
  });

  it("does not resurrect a session after logout during renewal", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async url => {
      if (String(url).endsWith("/auth/refresh")) { clearAuthSessionStorage(); return json(renewed); }
      return json(null, 401);
    });
    await expect(new ApiClient({ getAccessToken }).get("/profile")).rejects.toThrow();
    expect(readAuthSessionStorage()).toBeNull();
  });

  it("clears only a definitively rejected refresh session", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(null, 401));
    await expect(new ApiClient({ getAccessToken }).get("/profile")).rejects.toThrow();
    expect(readAuthSessionStorage()).toBeNull();
  });

  it("retries multipart requests without changing the boundary or body", async () => {
    const form = new FormData(); form.set("image", new File(["test"], "test.png"));
    const calls: RequestInit[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
      if (String(url).endsWith("/auth/refresh")) return json(renewed);
      calls.push(options!);
      return new Headers(options?.headers).get("Authorization") === "Bearer new-access" ? json({ ok: true }) : json(null, 401);
    });
    await expect(new ApiClient({ getAccessToken }).post("/upload", form)).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);
    expect(calls.every(call => call.body === form && !new Headers(call.headers).has("Content-Type"))).toBe(true);
  });

  it("renews private image requests without losing no-store or PNG validation", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
      if (String(url).endsWith("/auth/refresh")) return json(renewed);
      expect(options?.cache).toBe("no-store");
      return new Headers(options?.headers).get("Authorization") === "Bearer new-access"
        ? new Response(new Blob(["png"], { type: "image/png" }), { headers: { "Content-Type": "image/png" } }) : json(null, 401);
    });
    expect((await new ApiClient({ getAccessToken }).getBlob("/image")).type).toBe("image/png");
  });

  it("does not clear a new login when an older refresh is rejected", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async url => {
      if (String(url).endsWith("/auth/refresh")) {
        writeAuthSessionStorage(JSON.stringify({ ...renewed, user: { id: "another-user" } }));
        return json(null, 401);
      }
      return json(null, 401);
    });
    await expect(new ApiClient({ getAccessToken }).get("/profile")).rejects.toThrow();
    expect(JSON.parse(readAuthSessionStorage()!).user.id).toBe("another-user");
  });

  it("retries a late 401 using the session another request already renewed", async () => {
    let finishSlow: ((value: Response) => void) | undefined;
    let refreshCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
      if (String(url).endsWith("/auth/refresh")) { refreshCount++; return json(renewed); }
      if (new Headers(options?.headers).get("Authorization") === "Bearer new-access") return json({ ok: true });
      if (String(url).endsWith("/slow")) return new Promise<Response>(resolve => { finishSlow = resolve; });
      return json(null, 401);
    });
    const client = new ApiClient({ getAccessToken });
    const slow = client.get("/slow");
    await client.get("/fast");
    finishSlow!(json(null, 401));
    await expect(slow).resolves.toEqual({ ok: true });
    expect(refreshCount).toBe(1);
  });

  it("does not retry an old user's request under another user's new login", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      writeAuthSessionStorage(JSON.stringify({ ...renewed, user: { id: "another-user" } }));
      return json(null, 401);
    });
    await expect(new ApiClient({ getAccessToken }).post("/purchase", { courseId: "test" })).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(readAuthSessionStorage()!).user.id).toBe("another-user");
  });

  it("uses a browser-wide lock for refresh and rechecks storage after waiting", async () => {
    const request = vi.fn(async (_name: string, callback: () => Promise<unknown>) => {
      writeAuthSessionStorage(JSON.stringify(renewed));
      return callback();
    });
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) =>
      new Headers(options?.headers).get("Authorization") === "Bearer new-access" ? json({ ok: true }) : json(null, 401));
    try {
      await expect(new ApiClient({ getAccessToken }).get("/profile")).resolves.toEqual({ ok: true });
      expect(request).toHaveBeenCalledWith("gds-auth-refresh", expect.any(Function));
    } finally {
      Reflect.deleteProperty(navigator, "locks");
    }
  });
});
