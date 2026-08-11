import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./api-client";

const firebaseMocks = vi.hoisted(() => ({
  auth: { currentUser: null as unknown },
  getConfiguredFirebaseAuth: vi.fn(),
  reload: vi.fn(),
  sendEmailVerification: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("../lib/firebase", () => ({
  getConfiguredFirebaseAuth: firebaseMocks.getConfiguredFirebaseAuth,
}));

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: firebaseMocks.createUserWithEmailAndPassword,
  reload: firebaseMocks.reload,
  sendEmailVerification: firebaseMocks.sendEmailVerification,
  signInWithEmailAndPassword: firebaseMocks.signInWithEmailAndPassword,
  updateProfile: firebaseMocks.updateProfile,
}));

import { authService, getAuthErrorMessage } from "./auth.service";

const user = {
  email: "student@example.com",
  emailVerified: false,
  getIdToken: vi.fn(),
};

describe("Firebase email/password authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    firebaseMocks.auth.currentUser = user;
    firebaseMocks.getConfiguredFirebaseAuth.mockReturnValue(firebaseMocks.auth);
    firebaseMocks.createUserWithEmailAndPassword.mockResolvedValue({ user });
    firebaseMocks.signInWithEmailAndPassword.mockResolvedValue({ user });
    firebaseMocks.reload.mockResolvedValue(undefined);
    firebaseMocks.sendEmailVerification.mockResolvedValue(undefined);
    firebaseMocks.updateProfile.mockResolvedValue(undefined);
    user.emailVerified = false;
    user.getIdToken.mockResolvedValue("firebase-id-token");
  });

  it("registers through Firebase and never stores the password", async () => {
    await expect(
      authService.registerWithEmail({
        email: " STUDENT@example.com ",
        fullName: " Student User ",
        password: "Str0ngPassword!123",
        role: "instructor",
      }),
    ).resolves.toMatchObject({
      email: "student@example.com",
      role: "instructor",
    });

    expect(firebaseMocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      firebaseMocks.auth,
      "STUDENT@example.com",
      "Str0ngPassword!123",
    );
    expect(firebaseMocks.updateProfile).toHaveBeenCalledWith(user, {
      displayName: "Student User",
    });
    expect(firebaseMocks.sendEmailVerification).toHaveBeenCalledWith(user);
    expect(window.sessionStorage.length).toBeGreaterThan(0);
    expect(window.sessionStorage.getItem("eduai.pending-email-verification.v1")).not.toContain(
      "Str0ngPassword!123",
    );
  });

  it("completes verified email registration with a local password hash request", async () => {
    await authService.registerWithEmail({
      email: "student@example.com",
      fullName: "Student User",
      password: "Str0ngPassword!123",
      role: "instructor",
    });
    user.emailVerified = true;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "access-token",
              refreshToken: "refresh-token",
              tokenType: "Bearer",
              expiresIn: 900,
              user: {
                id: "user-id",
                email: user.email,
                fullName: "Student User",
                roles: ["student"],
                status: "active",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            },
            message: "OK",
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      authService.completeEmailRegistration(),
    ).resolves.toMatchObject({ accessToken: "access-token" });

    expect(firebaseMocks.reload).toHaveBeenCalledWith(user);
    expect(user.getIdToken).toHaveBeenCalledWith(true);
    const [, request] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(request?.body))).toEqual({
      idToken: "firebase-id-token",
      mode: "register",
      password: "Str0ngPassword!123",
      role: "instructor",
    });
    expect(window.sessionStorage.getItem("eduai.pending-email-verification.v1")).toBeNull();
  });

  it("rejects registration completion until Firebase confirms the email", async () => {
    await authService.registerWithEmail({
      email: "student@example.com",
      fullName: "Student User",
      password: "Str0ngPassword!123",
      role: "student",
    });

    await expect(authService.completeEmailRegistration()).rejects.toMatchObject({
      code: "EMAIL_NOT_VERIFIED",
      status: 403,
    });
    expect(user.getIdToken).not.toHaveBeenCalled();
  });

  it.each([
    "admin.demo@eduai.local",
    "registered.user@example.com",
  ])("uses the same backend login endpoint for %s", async (email) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "legacy-access-token",
              refreshToken: "legacy-refresh-token",
              tokenType: "Bearer",
              expiresIn: 900,
              user: {
                id: "user-id",
                email,
                fullName: "Student User",
                roles: ["student"],
                status: "active",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            },
            message: "OK",
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      authService.login({
        email,
        password: "Str0ngPassword!123",
      }),
    ).resolves.toMatchObject({ accessToken: "legacy-access-token" });

    expect(firebaseMocks.signInWithEmailAndPassword).not.toHaveBeenCalled();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not expose a Firebase-backed ordinary email login method", () => {
    expect(authService).not.toHaveProperty("loginWithEmail");
    expect(authService).not.toHaveProperty("register");
  });

  it.each([
    [
      "ACCOUNT_NOT_FOUND",
      "Tài khoản chưa tồn tại. Vui lòng đăng ký.",
    ],
    ["INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng."],
    ["ACCOUNT_BLOCKED", "Tài khoản đã bị khóa."],
  ])("maps %s to a stable user-facing message", (code, expected) => {
    expect(getAuthErrorMessage(new ApiClientError("raw backend message", code, 401))).toBe(
      expected,
    );
  });

  it("resends verification only for an existing unverified Firebase user", async () => {
    await expect(authService.resendVerificationEmail()).resolves.toBeUndefined();
    expect(firebaseMocks.sendEmailVerification).toHaveBeenCalledWith(user);

    firebaseMocks.auth.currentUser = null;
    await expect(authService.resendVerificationEmail()).rejects.toBeInstanceOf(
      ApiClientError,
    );
    expect(firebaseMocks.sendEmailVerification).toHaveBeenCalledTimes(1);
  });
});
