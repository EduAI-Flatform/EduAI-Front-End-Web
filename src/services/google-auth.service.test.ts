import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./api-client";

const firebaseMocks = vi.hoisted(() => ({
  auth: { name: "firebase-auth" },
  googleProvider: { providerId: "google.com" },
  getConfiguredFirebaseAuth: vi.fn(),
  signInWithPopup: vi.fn(),
  signOutFirebase: vi.fn(),
}));

vi.mock("../lib/firebase", () => ({
  auth: firebaseMocks.auth,
  googleProvider: firebaseMocks.googleProvider,
  getConfiguredFirebaseAuth: firebaseMocks.getConfiguredFirebaseAuth,
  signOutFirebase: firebaseMocks.signOutFirebase,
}));

vi.mock("firebase/auth", () => ({
  signInWithPopup: firebaseMocks.signInWithPopup,
}));

import {
  authService,
  getGoogleAuthErrorMessage,
} from "./auth.service";

const session = {
  accessToken: "backend-access-token",
  refreshToken: "backend-refresh-token",
  tokenType: "Bearer" as const,
  expiresIn: 900,
  user: {
    id: "user-1",
    email: "student@example.com",
    fullName: "Student User",
    status: "active",
    roles: ["student"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

describe("authService.loginWithGoogle", () => {
  beforeEach(() => {
    firebaseMocks.getConfiguredFirebaseAuth.mockReturnValue(firebaseMocks.auth);
    firebaseMocks.signInWithPopup.mockResolvedValue({
      user: { getIdToken: vi.fn().mockResolvedValue("firebase-id-token") },
      credential: { accessToken: "google-access-token-that-must-not-be-sent" },
    });
    firebaseMocks.signOutFirebase.mockClear();
    firebaseMocks.signOutFirebase.mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, data: session, message: "OK" }),
          { headers: { "Content-Type": "application/json" }, status: 200 },
        ),
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exchanges only the Firebase ID token for the backend session", async () => {
    await expect(authService.loginWithGoogle()).resolves.toEqual(session);

    expect(firebaseMocks.signInWithPopup).toHaveBeenCalledWith(
      firebaseMocks.auth,
      firebaseMocks.googleProvider,
    );

    const [url, request] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/api/v1/auth/firebase");
    expect(JSON.parse(String(request?.body))).toEqual({
      idToken: "firebase-id-token",
    });
    expect(String(request?.body)).not.toContain("google-access-token");
  });

  it("marks Google auth as registration and sends the selected role", async () => {
    await expect(
      authService.registerWithGoogle("instructor"),
    ).resolves.toEqual(session);

    const [, request] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(request?.body))).toEqual({
      idToken: "firebase-id-token",
      mode: "register",
      role: "instructor",
    });
  });

  it("cleans up Firebase when the backend rejects a blocked account", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: "FORBIDDEN", message: "Account is disabled" },
        }),
        { headers: { "Content-Type": "application/json" }, status: 403 },
      ),
    );

    await expect(authService.loginWithGoogle()).rejects.toBeInstanceOf(
      ApiClientError,
    );
    expect(firebaseMocks.signOutFirebase).toHaveBeenCalledOnce();
    expect(
      getGoogleAuthErrorMessage(
        new ApiClientError("Account is disabled", "FORBIDDEN", 403),
      ),
    ).toContain("bị khóa");
  });

  it("signs out Firebase even when no backend refresh token exists", async () => {
    await expect(authService.logout()).resolves.toBeUndefined();

    expect(firebaseMocks.signOutFirebase).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("getGoogleAuthErrorMessage", () => {
  it("translates common popup errors", () => {
    expect(
      getGoogleAuthErrorMessage({ code: "auth/popup-closed-by-user" }),
    ).toContain("đóng cửa sổ");
    expect(getGoogleAuthErrorMessage({ code: "auth/popup-blocked" })).toContain(
      "chặn cửa sổ",
    );
    expect(
      getGoogleAuthErrorMessage({
        code: "auth/account-exists-with-different-credential",
      }),
    ).toContain("phương thức khác");
    expect(getGoogleAuthErrorMessage({ code: "auth/invalid-api-key" })).toContain(
      "Đăng nhập Google thất bại",
    );
  });
});
