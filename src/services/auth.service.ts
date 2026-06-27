import { ApiClient, ApiClientError } from "./api-client";
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

  logout(refreshToken: string): Promise<{ loggedOut: true }> {
    return authenticatedApiClient.post<{ loggedOut: true }>("/auth/logout", {
      refreshToken,
    });
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

  return "/dashboard";
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
