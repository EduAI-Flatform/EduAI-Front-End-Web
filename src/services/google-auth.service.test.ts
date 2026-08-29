import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./api-client";

const firebaseMocks = vi.hoisted(() => ({
  auth: { name: "firebase-auth" },
  googleProvider: { providerId: "google.com" },
  getConfiguredFirebaseAuth: vi.fn(),
  signInWithPopup: vi.fn(),
  signOutFirebase: vi.fn(),
}));

const monitoringMocks = vi.hoisted(() => ({
  reportClientError: vi.fn(),
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

vi.mock("./client-monitoring", () => ({
  reportClientError: monitoringMocks.reportClientError,
}));

import {
  authService,
  GoogleRoleSelectionRequiredError,
  getGoogleAuthErrorMessage,
  isEmbeddedBrowser,
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
    vi.clearAllMocks();
    window.sessionStorage.clear();
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0");
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
    vi.unstubAllGlobals();
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

  it("uses the same-context popup flow on mobile browsers", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36",
    );

    await expect(authService.loginWithGoogle()).resolves.toEqual(session);

    expect(firebaseMocks.signInWithPopup).toHaveBeenCalledWith(
      firebaseMocks.auth,
      firebaseMocks.googleProvider,
    );
  });

  it("does not depend on sessionStorage when mobile auth returns in the same context", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36",
    );

    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new Error("sessionStorage is inaccessible");
    });

    await expect(authService.registerWithGoogle("instructor")).resolves.toEqual(
      session,
    );

    const [, request] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(request?.body))).toEqual({
      idToken: "firebase-id-token",
      mode: "register",
      role: "instructor",
    });
  });

  it.each([
    "auth/no-auth-event",
    "auth/invalid-auth-event",
    "auth/user-mismatch",
    "auth/invalid-credential",
    "auth/redirect-cancelled-by-user",
  ])("never exchanges a %s result with the backend", async (code) => {
    firebaseMocks.signInWithPopup.mockRejectedValueOnce({ code });

    await expect(authService.loginWithGoogle()).rejects.toMatchObject({ code });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports a sanitized configuration-stage diagnostic for Firebase popup initialization failures", async () => {
    firebaseMocks.signInWithPopup.mockRejectedValueOnce({
      code: "auth/internal-error",
      message: "raw provider response must not be reported",
    });

    await expect(authService.loginWithGoogle()).rejects.toMatchObject({
      code: "auth/internal-error",
    });

    expect(monitoringMocks.reportClientError).toHaveBeenCalledWith({
      code: "GOOGLE_OAUTH_CONFIG_FAILED",
      detailCode: "auth/internal-error",
      stage: "authorization",
      statusCode: 0,
    });
    expect(JSON.stringify(monitoringMocks.reportClientError.mock.calls)).not.toContain(
      "raw provider response",
    );
  });

  it("classifies user-cancelled Google authorization without leaking provider data", async () => {
    firebaseMocks.signInWithPopup.mockRejectedValueOnce({
      code: "auth/popup-closed-by-user",
      credential: "must-not-be-reported",
    });

    await expect(authService.loginWithGoogle()).rejects.toMatchObject({
      code: "auth/popup-closed-by-user",
    });

    expect(monitoringMocks.reportClientError).toHaveBeenCalledWith({
      code: "GOOGLE_OAUTH_CANCELLED",
      detailCode: "auth/popup-closed-by-user",
      stage: "authorization",
      statusCode: 0,
    });
    expect(JSON.stringify(monitoringMocks.reportClientError.mock.calls)).not.toContain(
      "must-not-be-reported",
    );
  });

  it("classifies a failed backend token exchange without reporting the ID token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "FIREBASE_NOT_CONFIGURED",
            message: "Authentication is unavailable",
          },
        }),
        { headers: { "Content-Type": "application/json" }, status: 503 },
      ),
    );

    await expect(authService.loginWithGoogle()).rejects.toBeInstanceOf(
      ApiClientError,
    );

    expect(monitoringMocks.reportClientError).toHaveBeenCalledWith({
      code: "GOOGLE_OAUTH_CODE_EXCHANGE_FAILED",
      detailCode: "FIREBASE_NOT_CONFIGURED",
      stage: "token_exchange",
      statusCode: 503,
    });
    expect(JSON.stringify(monitoringMocks.reportClientError.mock.calls)).not.toContain(
      "firebase-id-token",
    );
  });

  it("requires a normal browser for embedded mobile app contexts", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36 Zalo/1.0",
    );

    await expect(authService.loginWithGoogle()).rejects.toMatchObject({
      code: "GOOGLE_EXTERNAL_BROWSER_REQUIRED",
    });
    expect(firebaseMocks.signInWithPopup).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("has no replayable redirect callback operation", () => {
    expect("completeGoogleRedirectSignIn" in authService).toBe(false);
  });

  it("allows a new Google user to retry with a selected role", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "ACCOUNT_ROLE_REQUIRED",
            message: "Account role is required",
          },
        }),
        { headers: { "Content-Type": "application/json" }, status: 409 },
      ),
    );

    const roleRequired = authService.loginWithGoogle();
    let caughtError: unknown;
    try {
      await roleRequired;
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(GoogleRoleSelectionRequiredError);
    if (!(caughtError instanceof GoogleRoleSelectionRequiredError)) {
      throw caughtError;
    }
    const error = caughtError;

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, data: session, message: "OK" }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      ),
    );

    await expect(error.retry("instructor")).resolves.toEqual(session);

    const [, request] = vi.mocked(fetch).mock.calls[1];
    expect(JSON.parse(String(request?.body))).toEqual({
      idToken: "firebase-id-token",
      mode: "register",
      role: "instructor",
    });
    expect(firebaseMocks.signOutFirebase).not.toHaveBeenCalled();
  });

  it("reports a failed role-selection token exchange", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "ACCOUNT_ROLE_REQUIRED",
              message: "Account role is required",
            },
          }),
          { headers: { "Content-Type": "application/json" }, status: 409 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "ACCOUNT_CONFLICT",
              message: "Account cannot be linked",
            },
          }),
          { headers: { "Content-Type": "application/json" }, status: 409 },
        ),
      );

    let roleError: unknown;
    try {
      await authService.loginWithGoogle();
    } catch (error) {
      roleError = error;
    }
    expect(roleError).toBeInstanceOf(GoogleRoleSelectionRequiredError);
    if (!(roleError instanceof GoogleRoleSelectionRequiredError)) {
      throw roleError;
    }

    await expect(roleError.retry("student")).rejects.toBeInstanceOf(
      ApiClientError,
    );
    expect(monitoringMocks.reportClientError).toHaveBeenCalledWith({
      code: "GOOGLE_OAUTH_CODE_EXCHANGE_FAILED",
      detailCode: "ACCOUNT_CONFLICT",
      stage: "token_exchange",
      statusCode: 409,
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
  it("keeps redirect-state failures inside the EduAI recovery UI", () => {
    expect(
      getGoogleAuthErrorMessage({ code: "GOOGLE_EXTERNAL_BROWSER_REQUIRED" }),
    ).toContain("trình duyệt");
    expect(
      getGoogleAuthErrorMessage(
        new Error("Unable to process request due to missing initial state."),
      ),
    ).toContain("trình duyệt");
  });

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

describe("isEmbeddedBrowser", () => {
  it.each([
    ["Zalo on Android", "Mozilla/5.0 (Linux; Android 14; Mobile) Zalo/1.0"],
    ["Zalo on iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Zalo/1.0"],
    ["Facebook in-app browser", "Mozilla/5.0 (Linux; Android 14) FB_IAB/FB4A"],
    ["Facebook on iOS", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/500.0.0.0.0;FBDV/iPhone]"],
    ["Messenger in-app browser", "Mozilla/5.0 (Linux; Android 14) Messenger"],
    ["Android WebView", "Mozilla/5.0 (Linux; Android 14; wv) Version/4.0"],
  ])("detects %s", (_label, userAgent) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    expect(isEmbeddedBrowser()).toBe(true);
  });

  it.each([
    ["Safari on iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1"],
    ["Chrome on Android", "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36"],
    ["Chrome on desktop", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36"],
  ])("allows a normal %s tab", (_label, userAgent) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    expect(isEmbeddedBrowser()).toBe(false);
  });
});
