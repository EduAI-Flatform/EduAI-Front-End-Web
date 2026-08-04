import { ApiClient, ApiClientError } from "./api-client";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
} from "firebase/auth";
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

export interface PendingEmailVerification {
  email: string;
  fullName: string;
  role: RegistrationRole;
}

export class GoogleRoleSelectionRequiredError extends Error {
  readonly code = "ACCOUNT_ROLE_REQUIRED";

  constructor(
    private readonly retryRequest: (
      role: RegistrationRole,
    ) => Promise<AuthSession>,
    private readonly cleanup: () => Promise<void>,
  ) {
    super("A role must be selected before creating a Google account.");
    this.name = "GoogleRoleSelectionRequiredError";
  }

  retry(role: RegistrationRole): Promise<AuthSession> {
    return this.retryRequest(role);
  }

  cancel(): Promise<void> {
    return this.cleanup();
  }
}

const PENDING_EMAIL_VERIFICATION_KEY = "eduai.pending-email-verification.v1";
const GOOGLE_REDIRECT_CONTEXT_KEY = "eduai.google-redirect-context.v1";

type GoogleExchangeOptions = {
  mode: "register";
  role: RegistrationRole;
};

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const authService = {
  login(input: LoginInput): Promise<AuthSession> {
    return authenticatedApiClient.post<AuthSession>("/auth/login", { ...input });
  },

  async loginWithGoogle(): Promise<AuthSession> {
    return exchangeGoogleToken();
  },

  async completeGoogleRedirectSignIn(): Promise<AuthSession | null> {
    return completeGoogleRedirectSignIn();
  },

  async registerWithGoogle(role: RegistrationRole): Promise<AuthSession> {
    return exchangeGoogleToken({ mode: "register", role });
  },

  async registerWithEmail(
    input: RegisterInput,
  ): Promise<PendingEmailVerification> {
    const firebaseAuth = getConfiguredFirebaseAuth();
    const email = input.email.trim();
    const fullName = input.fullName.trim();
    const result = await createUserWithEmailAndPassword(
      firebaseAuth,
      email,
      input.password,
    );

    await updateProfile(result.user, { displayName: fullName });
    await sendEmailVerification(result.user);

    const pendingVerification = {
      email: email.toLowerCase(),
      fullName,
      role: input.role,
    };
    savePendingEmailVerification(pendingVerification);
    return pendingVerification;
  },

  async loginWithEmail(input: LoginInput): Promise<AuthSession> {
    const firebaseAuth = getConfiguredFirebaseAuth();
    const result = await signInWithEmailAndPassword(
      firebaseAuth,
      input.email.trim(),
      input.password,
    );

    await reload(result.user);

    if (!result.user.emailVerified) {
      throw new ApiClientError(
        "Email chưa được xác minh. Vui lòng kiểm tra hộp thư.",
        "EMAIL_NOT_VERIFIED",
        403,
      );
    }

    const idToken = await result.user.getIdToken(true);
    const pendingVerification = getPendingEmailVerification();
    const role =
      pendingVerification &&
      pendingVerification.email === result.user.email?.trim().toLowerCase()
        ? pendingVerification.role
        : undefined;
    const session = await authenticatedApiClient.post<AuthSession>(
      "/auth/firebase",
      role ? { idToken, role } : { idToken },
    );

    clearPendingEmailVerification();
    return session;
  },

  async resendVerificationEmail(): Promise<void> {
    const firebaseAuth = getConfiguredFirebaseAuth();
    const currentUser = firebaseAuth.currentUser;

    if (!currentUser) {
      throw new ApiClientError(
        "Vui lòng đăng nhập lại để gửi email xác minh.",
        "AUTH_REQUIRES_SIGN_IN",
        401,
      );
    }

    await reload(currentUser);

    if (currentUser.emailVerified) {
      throw new ApiClientError(
        "Email đã được xác minh. Vui lòng đăng nhập để tiếp tục.",
        "EMAIL_ALREADY_VERIFIED",
        400,
      );
    }

    await sendEmailVerification(currentUser);
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

async function exchangeGoogleToken(options?: {
  mode: "register";
  role: RegistrationRole;
}): Promise<AuthSession> {
  const firebaseAuth = getConfiguredFirebaseAuth();

  try {
    // Firebase recommends redirect sign-in for mobile web browsers because
    // popup flows are not reliable on mobile devices.
    // Source: https://firebase.google.com/docs/auth/web/google-signin
    if (isMobileBrowser()) {
      saveGoogleRedirectContext(options);
      return signInWithRedirect(firebaseAuth, googleProvider);
    }

    const result = await signInWithPopup(firebaseAuth, googleProvider);
    return await exchangeGoogleResult(result, options);
  } catch (error) {
    if (error instanceof GoogleRoleSelectionRequiredError) {
      throw error;
    }

    await signOutFirebase();
    throw error;
  }
}

async function completeGoogleRedirectSignIn(): Promise<AuthSession | null> {
  const firebaseAuth = getConfiguredFirebaseAuth();
  const options = getGoogleRedirectContext();

  try {
    const result = await getRedirectResult(firebaseAuth);

    if (!result) {
      return null;
    }

    const session = await exchangeGoogleResult(result, options);
    clearGoogleRedirectContext();
    return session;
  } catch (error) {
    if (error instanceof GoogleRoleSelectionRequiredError) {
      throw error;
    }

    await signOutFirebase();
    throw error;
  }
}

type GoogleSignInResult = Awaited<ReturnType<typeof signInWithPopup>>;

async function exchangeGoogleResult(
  result: GoogleSignInResult,
  options?: GoogleExchangeOptions,
): Promise<AuthSession> {
  const idToken = await result.user.getIdToken();

  try {
    return await exchangeFirebaseToken(idToken, options);
  } catch (error) {
    if (
      !options &&
      error instanceof ApiClientError &&
      error.code === "ACCOUNT_ROLE_REQUIRED"
    ) {
      throw new GoogleRoleSelectionRequiredError(
        async (role) => {
          try {
            return await exchangeFirebaseToken(idToken, {
              mode: "register",
              role,
            });
          } catch (retryError) {
            await signOutFirebase();
            throw retryError;
          }
        },
        signOutFirebase,
      );
    }

    throw error;
  }
}

export function isMobileBrowser(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  );
}

function exchangeFirebaseToken(
  idToken: string,
  options?: GoogleExchangeOptions,
): Promise<AuthSession> {
  const body = options
    ? { idToken, mode: options.mode, role: options.role }
    : { idToken };

  return authenticatedApiClient.post<AuthSession>("/auth/firebase", body);
}

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

  return "/";
}

export function getPendingEmailVerification(): PendingEmailVerification | null {
  const rawValue = window.sessionStorage.getItem(PENDING_EMAIL_VERIFICATION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const value = JSON.parse(rawValue) as Partial<PendingEmailVerification>;

    if (
      typeof value.email !== "string" ||
      typeof value.fullName !== "string" ||
      (value.role !== "student" && value.role !== "instructor")
    ) {
      clearPendingEmailVerification();
      return null;
    }

    return {
      email: value.email,
      fullName: value.fullName,
      role: value.role,
    };
  } catch {
    clearPendingEmailVerification();
    return null;
  }
}

export function getAuthErrorMessage(error: unknown): string {
  const code = error instanceof ApiClientError ? error.code : getErrorCode(error);
  const mappedMessage = getEmailAuthErrorMessage(code);

  if (mappedMessage) {
    return mappedMessage;
  }

  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Yêu cầu thất bại. Vui lòng thử lại.";
}

function getEmailAuthErrorMessage(code: string | undefined): string | undefined {
  switch (code) {
    case "auth/email-already-in-use":
      return "Email này đã được sử dụng.";
    case "auth/invalid-email":
      return "Địa chỉ email không hợp lệ.";
    case "auth/weak-password":
      return "Mật khẩu chưa đủ mạnh.";
    case "auth/invalid-credential":
      return "Email hoặc mật khẩu không đúng.";
    case "auth/too-many-requests":
      return "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.";
    case "auth/network-request-failed":
      return "Không thể kết nối mạng. Vui lòng thử lại.";
    case "auth/user-disabled":
    case "ACCOUNT_BLOCKED":
      return "Tài khoản đã bị khóa.";
    case "EMAIL_NOT_VERIFIED":
      return "Email chưa được xác minh. Vui lòng kiểm tra hộp thư.";
    case "INVALID_FIREBASE_TOKEN":
      return "Phiên đăng nhập không hợp lệ.";
    case "FIREBASE_NOT_CONFIGURED":
      return "Hệ thống đăng nhập chưa được cấu hình.";
    case "ACCOUNT_LINK_CONFLICT":
      return "Email này đã được liên kết với tài khoản khác.";
    case "ACCOUNT_ALREADY_EXISTS":
      return "Tài khoản này đã tồn tại. Vui lòng đăng nhập.";
    case "AUTH_REQUIRES_SIGN_IN":
      return "Vui lòng đăng nhập lại để gửi email xác minh.";
    case "EMAIL_ALREADY_VERIFIED":
      return "Email đã được xác minh. Vui lòng đăng nhập để tiếp tục.";
    default:
      return undefined;
  }
}

export function getGoogleAuthErrorMessage(error: unknown): string {
  const firebaseCode = getErrorCode(error);
  const mappedBackendMessage = getEmailAuthErrorMessage(firebaseCode);

  if (mappedBackendMessage && !firebaseCode?.startsWith("auth/")) {
    return mappedBackendMessage;
  }

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

function savePendingEmailVerification(
  value: PendingEmailVerification,
): void {
  window.sessionStorage.setItem(
    PENDING_EMAIL_VERIFICATION_KEY,
    JSON.stringify(value),
  );
}

function saveGoogleRedirectContext(options?: GoogleExchangeOptions): void {
  window.sessionStorage.setItem(
    GOOGLE_REDIRECT_CONTEXT_KEY,
    JSON.stringify(options ?? null),
  );
}

function getGoogleRedirectContext(): GoogleExchangeOptions | undefined {
  const rawValue = window.sessionStorage.getItem(GOOGLE_REDIRECT_CONTEXT_KEY);

  if (!rawValue) {
    return undefined;
  }

  try {
    const value = JSON.parse(rawValue) as Partial<GoogleExchangeOptions> | null;

    if (
      value?.mode === "register" &&
      (value.role === "student" || value.role === "instructor")
    ) {
      return {
        mode: "register",
        role: value.role,
      };
    }
  } catch {
    // Ignore malformed redirect context and continue as a login flow.
  }

  return undefined;
}

function clearGoogleRedirectContext(): void {
  window.sessionStorage.removeItem(GOOGLE_REDIRECT_CONTEXT_KEY);
}

function clearPendingEmailVerification(): void {
  window.sessionStorage.removeItem(PENDING_EMAIL_VERIFICATION_KEY);
}
