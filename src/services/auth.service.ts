import { ApiClient, ApiClientError } from "./api-client";
import { signInWithPopup } from "firebase/auth";
import {
  getConfiguredFirebaseAuth,
  googleProvider,
  signOutFirebase,
} from "../lib/firebase";
import {
  clearAuthSessionStorage,
  readAuthSessionStorage,
  writeAuthSessionStorage,
} from "./auth-session.storage";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  status: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type RegistrationRole = "student" | "instructor";

export interface RegisterInput extends LoginInput {
  fullName: string;
  role: RegistrationRole;
}

export interface RegisterResponse {
  user: AuthUser;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const authService = {
  login(input: LoginInput): Promise<AuthSession> {
    return authenticatedApiClient.post<AuthSession>("/auth/login", { ...input });
  },

  async loginWithGoogle(): Promise<AuthSession> {
    const firebaseAuth = getConfiguredFirebaseAuth();

    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await result.user.getIdToken();

      return await authenticatedApiClient.post<AuthSession>("/auth/firebase", {
        idToken,
      });
    } catch (error) {
      await signOutFirebase();
      throw error;
    }
  },

  async logout(refreshToken?: string | null): Promise<void> {
    try {
      if (refreshToken) {
        await authenticatedApiClient.post<{ loggedOut: true }>("/auth/logout", {
          refreshToken,
        });
      }
    } finally {
      await signOutFirebase();
    }
  },

  register(input: RegisterInput): Promise<RegisterResponse> {
    return authenticatedApiClient.post<RegisterResponse>("/auth/register", {
      ...input,
    });
  },

  me(): Promise<AuthUser> {
    return authenticatedApiClient.get<AuthUser>("/auth/me");
  },
};

export function saveAuthSession(session: AuthSession): void {
  writeAuthSessionStorage(JSON.stringify(session));
}

export function getAuthSession(): AuthSession | null {
  const rawSession = readAuthSessionStorage();

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    clearAuthSessionStorage();
    return null;
  }
}

export function getDefaultRouteForRoles(roles: string[]): string {
  if (roles.includes("platform_admin")) {
    return "/admin/dashboard";
  }

  if (roles.includes("instructor")) {
    return "/instructor/dashboard";
  }

  return roles.includes("student") ? "/dashboard" : "/";
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Yêu cầu thất bại. Vui lòng thử lại.";
}

export function getGoogleAuthErrorMessage(error: unknown): string {
  const firebaseCode = getErrorCode(error);

  switch (firebaseCode) {
    case "auth/popup-closed-by-user":
      return "Bạn đã đóng cửa sổ đăng nhập Google.";
    case "auth/popup-blocked":
      return "Trình duyệt đã chặn cửa sổ Google. Hãy cho phép popup rồi thử lại.";
    case "auth/account-exists-with-different-credential":
      return "Email Google này đã được đăng ký bằng phương thức khác. Vui lòng đăng nhập bằng email và mật khẩu.";
    case "auth/unauthorized-domain":
      return "Tên miền hiện tại chưa được cấp phép đăng nhập Google.";
    case "auth/operation-not-allowed":
      return "Đăng nhập Google chưa được bật trên hệ thống.";
    case "auth/network-request-failed":
      return "Không thể kết nối đến Google. Vui lòng kiểm tra mạng và thử lại.";
  }

  if (isBlockedAccountError(error)) {
    return "Tài khoản của bạn đã bị khóa hoặc chưa được phép truy cập.";
  }

  if (error instanceof ApiClientError) {
    return "Không thể đăng nhập bằng Google. Vui lòng thử lại.";
  }

  if (firebaseCode?.startsWith("auth/")) {
    return "Đăng nhập Google thất bại. Vui lòng thử lại.";
  }

  if (error instanceof Error) {
    return error.message.startsWith("Thiếu cấu hình Firebase")
      ? error.message
      : "Đăng nhập Google thất bại. Vui lòng thử lại.";
  }

  return "Không thể đăng nhập bằng Google. Vui lòng thử lại.";
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function isBlockedAccountError(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) {
    return false;
  }

  const value = `${error.code} ${error.message}`.toUpperCase();

  return (
    error.status === 403 ||
    /FORBIDDEN|ACCOUNT_LOCKED|ACCOUNT_DISABLED|USER_DISABLED|NOT_ALLOWED|ACCESS_DENIED|BLOCKED|INACTIVE/.test(
      value,
    )
  );
}
