import { ApiClient, ApiClientError, buildApiUrl } from "./api-client";
import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
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
import { reportClientError } from "./client-monitoring";

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
export type SocialOAuthProvider = "facebook" | "zalo";
export type SocialOAuthMode = "login" | "register";

export interface OAuthProviderCapabilities {
  google: boolean;
  facebook: boolean;
  zalo: boolean;
}

export interface SocialOAuthStartInput {
  mode?: SocialOAuthMode;
  redirectTo?: string;
  role?: RegistrationRole;
}

export interface OAuthProfileRequiredResponse {
  kind: "profile_required";
  provider: SocialOAuthProvider;
  ticket: string;
  redirectTo: string;
  displayName?: string;
}

export interface OAuthSessionResponse {
  kind: "session";
  session: AuthSession;
  redirectTo: string;
}

export type OAuthExchangeResponse =
  | OAuthProfileRequiredResponse
  | OAuthSessionResponse;

export type GoogleOAuthStage =
  | "authorization"
  | "callback"
  | "token_exchange"
  | "session";

export interface RegisterInput extends LoginInput {
  fullName: string;
  role: RegistrationRole;
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

export class GoogleExternalBrowserRequiredError extends Error {
  readonly code = "GOOGLE_EXTERNAL_BROWSER_REQUIRED";

  constructor() {
    super(
      "Vui lòng mở EduAI bằng trình duyệt thường để tiếp tục đăng nhập Google.",
    );
    this.name = "GoogleExternalBrowserRequiredError";
  }
}

const PENDING_EMAIL_VERIFICATION_KEY = "eduai.pending-email-verification.v1";
let pendingEmailRegistrationPassword: string | null = null;

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

  async registerWithGoogle(role: RegistrationRole): Promise<AuthSession> {
    return exchangeGoogleToken({ mode: "register", role });
  },

  getOAuthProviders(): Promise<OAuthProviderCapabilities> {
    return authenticatedApiClient.get<OAuthProviderCapabilities>(
      "/auth/oauth/providers",
    );
  },

  startSocialOAuth(
    provider: SocialOAuthProvider,
    input: SocialOAuthStartInput = {},
  ): void {
    window.location.assign(buildSocialOAuthStartUrl(provider, input));
  },

  exchangeOAuthTicket(ticket: string): Promise<OAuthExchangeResponse> {
    return authenticatedApiClient.post<OAuthExchangeResponse>(
      "/auth/oauth/exchange",
      { ticket },
    );
  },

  completeOAuthProfile(input: {
    email: string;
    fullName?: string;
    ticket: string;
  }): Promise<OAuthSessionResponse> {
    return authenticatedApiClient.post<OAuthSessionResponse>(
      "/auth/oauth/complete-profile",
      input,
    );
  },

  async registerWithEmail(
    input: RegisterInput,
  ): Promise<PendingEmailVerification> {
    pendingEmailRegistrationPassword = null;
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
    pendingEmailRegistrationPassword = input.password;

    const pendingVerification = {
      email: email.toLowerCase(),
      fullName,
      role: input.role,
    };
    savePendingEmailVerification(pendingVerification);
    return pendingVerification;
  },

  async completeEmailRegistration(
    resumedPassword?: string,
  ): Promise<AuthSession> {
    const firebaseAuth = getConfiguredFirebaseAuth();
    const pendingVerification = getPendingEmailVerification();

    if (!pendingVerification) {
      throw new ApiClientError(
        "Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.",
        "REGISTRATION_CONTEXT_EXPIRED",
        400,
      );
    }

    const password = pendingEmailRegistrationPassword ?? resumedPassword;

    if (!password) {
      throw new ApiClientError(
        "Vui lòng nhập lại mật khẩu đăng ký để tiếp tục.",
        "REGISTRATION_PASSWORD_REQUIRED",
        400,
      );
    }

    let currentUser = firebaseAuth.currentUser;

    if (
      resumedPassword ||
      !currentUser ||
      currentUser.email?.trim().toLowerCase() !== pendingVerification.email
    ) {
      const result = await signInWithEmailAndPassword(
        firebaseAuth,
        pendingVerification.email,
        password,
      );
      currentUser = result.user;
    }

    await reload(currentUser);

    if (!currentUser.emailVerified) {
      throw new ApiClientError(
        "Email chưa được xác minh. Vui lòng kiểm tra hộp thư.",
        "EMAIL_NOT_VERIFIED",
        403,
      );
    }

    const idToken = await currentUser.getIdToken(true);
    const session = await authenticatedApiClient.post<AuthSession>(
      "/auth/firebase",
      {
        idToken,
        mode: "register",
        password,
        role: pendingVerification.role,
      },
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

  me(): Promise<AuthUser> {
    return authenticatedApiClient.get<AuthUser>("/auth/me");
  },
};

async function exchangeGoogleToken(options?: {
  mode: "register";
  role: RegistrationRole;
}): Promise<AuthSession> {
  const firebaseAuth = getConfiguredFirebaseAuth();

  let result: GoogleSignInResult;

  try {
    // Keep Google auth in the initiating browser context. Firebase's full-page
    // redirect resolver uses sessionStorage for its pending event, which is
    // lost when an in-app browser hands navigation to Chrome or another app.
    // Popup auth still uses Firebase's provider/state validation, but returns
    // the result to this page without requiring a redirect callback.
    if (isEmbeddedBrowser()) {
      throw new GoogleExternalBrowserRequiredError();
    }

    result = await signInWithPopup(firebaseAuth, googleProvider);
  } catch (error) {
    reportGoogleOAuthFailure(error, "authorization");
    await signOutFirebase();
    throw error;
  }

  try {
    return await exchangeGoogleResult(result, options);
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
  let idToken: string;

  try {
    idToken = await result.user.getIdToken();
  } catch (error) {
    reportGoogleOAuthFailure(error, "callback");
    throw error;
  }

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
            reportGoogleOAuthFailure(retryError, "token_exchange");
            await signOutFirebase();
            throw retryError;
          }
        },
        signOutFirebase,
      );
    }

    reportGoogleOAuthFailure(error, "token_exchange");
    throw error;
  }
}

export function reportGoogleOAuthFailure(
  error: unknown,
  stage: GoogleOAuthStage,
): void {
  const detailCode = getSafeDiagnosticCode(error);
  const event = {
    code: classifyGoogleOAuthFailure(error, stage),
    ...(error instanceof ApiClientError && error.correlationId
      ? { correlationId: error.correlationId }
      : {}),
    ...(detailCode ? { detailCode } : {}),
    stage,
    statusCode: error instanceof ApiClientError ? error.status : 0,
  };

  reportClientError(event);
}

function classifyGoogleOAuthFailure(
  error: unknown,
  stage: GoogleOAuthStage,
): string {
  const code = getErrorCode(error);

  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/redirect-cancelled-by-user"
  ) {
    return "GOOGLE_OAUTH_CANCELLED";
  }

  if (code === "auth/network-request-failed") {
    return "GOOGLE_OAUTH_NETWORK_FAILED";
  }

  if (
    code === "auth/no-auth-event" ||
    code === "auth/invalid-auth-event" ||
    code === "auth/user-mismatch"
  ) {
    return "GOOGLE_OAUTH_STATE_MISMATCH";
  }

  if (stage === "token_exchange") {
    return "GOOGLE_OAUTH_CODE_EXCHANGE_FAILED";
  }

  if (stage === "session") {
    return "GOOGLE_OAUTH_SESSION_FAILED";
  }

  if (
    code === "auth/argument-error" ||
    code === "auth/internal-error" ||
    code === "auth/invalid-api-key" ||
    code === "auth/operation-not-allowed" ||
    code === "auth/unauthorized-domain"
  ) {
    return "GOOGLE_OAUTH_CONFIG_FAILED";
  }

  return "GOOGLE_OAUTH_CALLBACK_FAILED";
}

function getSafeDiagnosticCode(error: unknown): string | undefined {
  const code = getErrorCode(error);

  return code && /^(?:auth\/[a-z0-9-]+|[A-Z][A-Z0-9_]+)$/.test(code)
    ? code
    : undefined;
}

export function isEmbeddedBrowser(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent;

  return (
    /FBAN|FBAV|FBIOS|FB_IAB|FB4A|Messenger|Instagram|Zalo|Line\//i.test(
      userAgent,
    ) ||
    (/Android/i.test(userAgent) && /\bwv\)/i.test(userAgent))
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

export function buildSocialOAuthStartUrl(
  provider: SocialOAuthProvider,
  input: SocialOAuthStartInput = {},
): string {
  const baseOrigin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const url = new URL(
    buildApiUrl(`/auth/oauth/${provider}/start`),
    baseOrigin,
  );

  if (input.mode) {
    url.searchParams.set("mode", input.mode);
  }
  if (input.role) {
    url.searchParams.set("role", input.role);
  }
  if (input.redirectTo && isSafeOAuthRedirectPath(input.redirectTo)) {
    url.searchParams.set("redirectTo", input.redirectTo);
  }

  return url.toString();
}

export function getSocialOAuthErrorMessage(
  code: string | null | undefined,
): string {
  return (
    getEmailAuthErrorMessage(code ?? undefined) ??
    "Không thể hoàn tất đăng nhập. Vui lòng thử lại."
  );
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
    case "ACCOUNT_NOT_FOUND":
      return "Tài khoản chưa tồn tại. Vui lòng đăng ký.";
    case "INVALID_CREDENTIALS":
      return "Email hoặc mật khẩu không đúng.";
    case "auth/user-disabled":
    case "ACCOUNT_BLOCKED":
      return "Tài khoản đã bị khóa.";
    case "EMAIL_NOT_VERIFIED":
      return "Email chưa được xác minh. Vui lòng kiểm tra hộp thư.";
    case "INVALID_FIREBASE_TOKEN":
      return "Phiên đăng nhập không hợp lệ.";
    case "FIREBASE_NOT_CONFIGURED":
      return "Hệ thống đăng nhập chưa được cấu hình.";
    case "OAUTH_PROVIDER_CANCELLED":
      return "Bạn đã hủy đăng nhập.";
    case "OAUTH_PROVIDER_UNAVAILABLE":
      return "Phương thức đăng nhập này chưa sẵn sàng.";
    case "OAUTH_STATE_INVALID":
    case "OAUTH_CALLBACK_FAILED":
    case "OAUTH_PROVIDER_REQUEST_FAILED":
    case "OAUTH_PROVIDER_RESPONSE_INVALID":
      return "Không thể hoàn tất đăng nhập. Vui lòng thử lại.";
    case "OAUTH_TICKET_INVALID":
      return "Phiên đăng nhập đã hết hạn. Vui lòng thử lại.";
    case "SOCIAL_ACCOUNT_LINK_REQUIRED":
      return "Email này đã có tài khoản EduAI. Hãy đăng nhập bằng phương thức hiện có trước.";
    case "ACCOUNT_ROLE_REQUIRED":
      return "Vui lòng chọn vai trò trước khi tạo tài khoản.";
    case "INVALID_EMAIL":
      return "Địa chỉ email không hợp lệ.";
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
    case "GOOGLE_EXTERNAL_BROWSER_REQUIRED":
      return "Hãy mở EduAI trong trình duyệt thường (Chrome hoặc Safari) để đăng nhập Google.";
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

  if (
    error instanceof Error &&
    /missing initial state|sessionStorage is inaccessible/i.test(error.message)
  ) {
    return "Trình duyệt đã không giữ được phiên Google. Hãy mở EduAI trong trình duyệt thường và thử lại.";
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

function clearPendingEmailVerification(): void {
  pendingEmailRegistrationPassword = null;
  window.sessionStorage.removeItem(PENDING_EMAIL_VERIFICATION_KEY);
}

function isSafeOAuthRedirectPath(value: string): boolean {
  return /^\/(?!\/)[A-Za-z0-9/_:-]*$/.test(value) && !value.includes("#");
}
