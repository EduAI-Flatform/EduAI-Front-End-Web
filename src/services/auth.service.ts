import { ApiClient, ApiClientError } from "./api-client";

const AUTH_SESSION_KEY = "eduai.auth.session.v1";

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

export interface RegisterInput extends LoginInput {
  fullName: string;
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
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function getAuthSession(): AuthSession | null {
  const rawSession = window.localStorage.getItem(AUTH_SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
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
