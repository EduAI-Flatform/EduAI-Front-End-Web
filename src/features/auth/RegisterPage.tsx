import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  authService,
  GoogleExternalBrowserRequiredError,
  getAuthErrorMessage,
  getDefaultRouteForRoles,
  getGoogleAuthErrorMessage,
  getSocialOAuthErrorMessage,
  isEmbeddedBrowser,
  reportGoogleOAuthFailure,
  SocialOAuthPopupError,
  type OAuthExchangeResponse,
  type OAuthProfileRequiredResponse,
  type OAuthSessionResponse,
  type RegistrationRole,
  type OAuthProviderCapabilities,
  type SocialOAuthProvider,
} from "../../services/auth.service";
import { setAuthSession } from "./auth-store";
import { AuthPageShell } from "./AuthPageShell";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { OAuthProfileCompletionDialog } from "./OAuthProfileCompletionDialog";
import {
  SocialRoleSelectionModal,
  type OAuthRegistrationProvider,
} from "./SocialRoleSelectionModal";
import { SocialOAuthButtons } from "./SocialOAuthButtons";
import { REGISTRATION_ROLE_OPTIONS } from "./registration-roles";
import {
  GoogleAuthRecoveryActions,
  GoogleEmbeddedBrowserRecovery,
} from "./GoogleAuthRecoveryActions";
import {
  AuthFormErrors,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordConfirmation,
  validateRegistrationRole,
} from "./auth-validation";
import "./auth.css";
import "./RegisterPage.css";

const roleOptions = REGISTRATION_ROLE_OPTIONS;

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RegistrationRole>("student");
  const [socialRoleProvider, setSocialRoleProvider] =
    useState<OAuthRegistrationProvider | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [oauthCapabilities, setOAuthCapabilities] =
    useState<OAuthProviderCapabilities>({
      google: true,
      facebook: false,
      zalo: false,
    });
  const [oauthLoadingProvider, setOAuthLoadingProvider] =
    useState<SocialOAuthProvider | null>(null);
  const [oauthProfile, setOAuthProfile] =
    useState<OAuthProfileRequiredResponse | null>(null);
  const [showGoogleRecovery, setShowGoogleRecovery] = useState(false);
  const [showExternalBrowserAction, setShowExternalBrowserAction] =
    useState(() => isEmbeddedBrowser());
  const redirectTo = searchParams.get("redirectTo");

  const isAuthSubmitting =
    isSubmitting ||
    isGoogleSubmitting ||
    Boolean(oauthLoadingProvider) ||
    Boolean(socialRoleProvider);

  useEffect(() => {
    let isMounted = true;

    void authService
      .getOAuthProviders()
      .then((capabilities) => {
        if (isMounted) {
          setOAuthCapabilities(capabilities);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(email),
      fullName: validateFullName(fullName),
      password: validatePassword(password),
      confirmPassword: validatePasswordConfirmation(password, confirmPassword),
      role: validateRegistrationRole(role),
    };

    setErrors(nextErrors);
    setFormError("");
    setShowGoogleRecovery(false);

    if (
      nextErrors.email ||
      nextErrors.fullName ||
      nextErrors.password ||
      nextErrors.confirmPassword ||
      nextErrors.role
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.registerWithEmail({
        email: email.trim(),
        fullName: fullName.trim(),
        password,
        role,
      });

      navigate("/check-email", { replace: true });
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleSignIn() {
    setSocialRoleProvider("google");
  }

  async function startGoogleRegistration(selectedRole: RegistrationRole) {
    setFormError("");
    setShowGoogleRecovery(true);
    setShowExternalBrowserAction(false);
    setIsGoogleSubmitting(true);

    try {
      const session = await authService.registerWithGoogle(selectedRole);
      try {
        setAuthSession(session);
      } catch (error) {
        reportGoogleOAuthFailure(error, "session");
        throw error;
      }
      navigate(getDefaultRouteForRoles(session.user.roles), { replace: true });
    } catch (error) {
      setShowExternalBrowserAction(
        error instanceof GoogleExternalBrowserRequiredError,
      );
      setFormError(getGoogleAuthErrorMessage(error));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  function handleSocialSignIn(provider: SocialOAuthProvider) {
    setFormError("");
    setShowGoogleRecovery(false);
    setShowExternalBrowserAction(false);
    setSocialRoleProvider(provider);
  }

  async function handleSocialRoleSelection(selectedRole: RegistrationRole) {
    const provider = socialRoleProvider;
    if (!provider) return;

    setRole(selectedRole);
    setSocialRoleProvider(null);

    if (provider === "google") {
      await startGoogleRegistration(selectedRole);
      return;
    }

    await startSocialRegistration(provider, selectedRole);
  }

  async function startSocialRegistration(
    provider: SocialOAuthProvider,
    selectedRole: RegistrationRole,
  ) {
    setFormError("");
    setShowGoogleRecovery(false);
    setShowExternalBrowserAction(false);
    setOAuthLoadingProvider(provider);

    try {
      const launch = authService.startSocialOAuth(provider, {
        mode: "register",
        redirectTo: getSafeOAuthRedirectPath(redirectTo),
        role: selectedRole,
      });
      if (launch?.kind === "popup") {
        await handleSocialOAuthResult(await launch.completion);
      }
    } catch (error) {
      setFormError(getOAuthFlowErrorMessage(error));
    } finally {
      setOAuthLoadingProvider(null);
    }
  }

  async function handleSocialOAuthResult(result: OAuthExchangeResponse) {
    if (result.kind === "profile_required") {
      setOAuthProfile(result);
      return;
    }

    finishSocialSession(result);
  }

  function finishSocialSession(result: OAuthSessionResponse) {
    try {
      setAuthSession(result.session);
      navigate(
        getSafeRedirectPath(
          result.redirectTo,
          getDefaultRouteForRoles(result.session.user.roles),
        ),
        { replace: true },
      );
    } catch (sessionError) {
      setFormError(getAuthErrorMessage(sessionError));
    }
  }

  return (
    <AuthPageShell
      description="Tạo tài khoản miễn phí và truy cập kho kiến thức AI khổng lồ ngay hôm nay."
      mode="register"
      title="Bắt đầu hành trình"
    >
      <form
        className="auth-form-card"
        noValidate
        onSubmit={handleSubmit}
      >
        {formError || showExternalBrowserAction ? (
          showExternalBrowserAction ? (
            <GoogleEmbeddedBrowserRecovery />
          ) : (
            <div className="auth-alert auth-alert--error">
              <AlertCircle aria-hidden="true" className="auth-alert__icon" />
              <div className="auth-alert__content">
                <p>{formError}</p>
                {showGoogleRecovery ? (
                  <GoogleAuthRecoveryActions
                    onRetry={() => {
                      void handleGoogleSignIn();
                    }}
                  />
                ) : null}
              </div>
            </div>
          )
        ) : null}

        <div className="auth-field-grid">
          <fieldset className="register-role-field">
            <legend>Bạn là ai?</legend>
            <div className="register-role-grid">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = role === option.value;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={
                      isSelected
                        ? "register-role-card register-role-card--selected"
                        : "register-role-card"
                    }
                    disabled={isAuthSubmitting}
                    key={option.value}
                    onClick={() => setRole(option.value)}
                    type="button"
                  >
                    <span className="register-role-card__icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    {isSelected ? (
                      <CheckCircle2
                        aria-hidden="true"
                        className="register-role-card__check"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {errors.role ? (
              <span className="auth-field__error">{errors.role}</span>
            ) : null}
          </fieldset>

          <label className="auth-field" htmlFor="register-name">
            Họ và tên
            <span className="auth-field__input-wrap">
              <UserRound
                aria-hidden="true"
                className="auth-field__leading-icon"
              />
              <Input
                aria-invalid={Boolean(errors.fullName)}
                autoComplete="name"
                className="auth-input auth-input--with-leading-icon"
                disabled={isAuthSubmitting}
                id="register-name"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                value={fullName}
              />
            </span>
            {errors.fullName ? (
              <span className="auth-field__error">{errors.fullName}</span>
            ) : null}
          </label>

          <label className="auth-field" htmlFor="register-email">
            Địa chỉ email
            <span className="auth-field__input-wrap">
              <Mail aria-hidden="true" className="auth-field__leading-icon" />
              <Input
                aria-invalid={Boolean(errors.email)}
                autoComplete="email"
                className="auth-input auth-input--with-leading-icon"
                disabled={isAuthSubmitting}
                id="register-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                type="email"
                value={email}
              />
            </span>
            {errors.email ? (
              <span className="auth-field__error">{errors.email}</span>
            ) : null}
          </label>

          <div className="auth-field-grid auth-field-grid--two">
            <label className="auth-field" htmlFor="register-password">
              Mật khẩu
              <span className="auth-field__input-wrap">
                <LockKeyhole
                  aria-hidden="true"
                  className="auth-field__leading-icon"
                />
                <Input
                  aria-invalid={Boolean(errors.password)}
                  autoComplete="new-password"
                  className="auth-input auth-input--with-icon auth-input--with-leading-icon"
                  disabled={isAuthSubmitting}
                  id="register-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={isPasswordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={isPasswordVisible}
                  className="auth-field__password-toggle"
                  disabled={isAuthSubmitting}
                  onClick={() => setIsPasswordVisible((current) => !current)}
                  type="button"
                >
                  {isPasswordVisible ? (
                    <EyeOff aria-hidden="true" className="auth-field__icon" />
                  ) : (
                    <Eye aria-hidden="true" className="auth-field__icon" />
                  )}
                </button>
              </span>
              {errors.password ? (
                <span className="auth-field__error">{errors.password}</span>
              ) : null}
            </label>

            <label className="auth-field" htmlFor="register-confirm-password">
              Xác nhận
              <span className="auth-field__input-wrap">
                <ShieldCheck
                  aria-hidden="true"
                  className="auth-field__leading-icon"
                />
                <Input
                  aria-invalid={Boolean(errors.confirmPassword)}
                  autoComplete="new-password"
                  className="auth-input auth-input--with-icon auth-input--with-leading-icon"
                  disabled={isAuthSubmitting}
                  id="register-confirm-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  type={isConfirmPasswordVisible ? "text" : "password"}
                  value={confirmPassword}
                />
                <button
                  aria-label={
                    isConfirmPasswordVisible
                      ? "Ẩn mật khẩu xác nhận"
                      : "Hiện mật khẩu xác nhận"
                  }
                  aria-pressed={isConfirmPasswordVisible}
                  className="auth-field__password-toggle"
                  disabled={isAuthSubmitting}
                  onClick={() =>
                    setIsConfirmPasswordVisible((current) => !current)
                  }
                  type="button"
                >
                  {isConfirmPasswordVisible ? (
                    <EyeOff aria-hidden="true" className="auth-field__icon" />
                  ) : (
                    <Eye aria-hidden="true" className="auth-field__icon" />
                  )}
                </button>
              </span>
              {errors.confirmPassword ? (
                <span className="auth-field__error">
                  {errors.confirmPassword}
                </span>
              ) : null}
            </label>
          </div>
        </div>

        <label className="auth-checkbox-row auth-checkbox-row--top">
          <input
            className="auth-checkbox auth-checkbox--offset"
            type="checkbox"
          />
          <span>
            Tôi đồng ý với điều khoản dịch vụ và chính sách bảo mật của EduAI.
          </span>
        </label>

        <Button
          className="auth-submit-button"
          disabled={isAuthSubmitting}
          type="submit"
        >
          {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          <ArrowRight aria-hidden="true" className="auth-submit-button__icon" />
        </Button>

        <>
          <div className="auth-divider">Hoặc đăng ký với</div>

          <div className="auth-social-grid">
            {!showExternalBrowserAction ? (
              <GoogleSignInButton
                disabled={isSubmitting || Boolean(oauthLoadingProvider)}
                isLoading={isGoogleSubmitting}
                onClick={handleGoogleSignIn}
              />
            ) : null}
            <SocialOAuthButtons
              capabilities={oauthCapabilities}
              disabled={
                isSubmitting ||
                isGoogleSubmitting ||
                Boolean(socialRoleProvider)
              }
              loadingProvider={oauthLoadingProvider}
              onSelect={(provider) => {
                handleSocialSignIn(provider);
              }}
            />
          </div>
        </>

        <p className="auth-switch-copy">
          Bạn đã có tài khoản?{" "}
          <Link className="auth-switch-link" to="/login">
            Đăng nhập ngay
          </Link>
        </p>
      </form>
      <SocialRoleSelectionModal
        isSubmitting={isGoogleSubmitting || Boolean(oauthLoadingProvider)}
        onCancel={() => setSocialRoleProvider(null)}
        onConfirm={handleSocialRoleSelection}
        provider={socialRoleProvider}
      />
      <OAuthProfileCompletionDialog
        onCancel={() => setOAuthProfile(null)}
        onComplete={async (profile, input) => {
          const result = await authService.completeOAuthProfile({
            ...input,
            ticket: profile.ticket,
          });
          setOAuthProfile(null);
          finishSocialSession(result);
        }}
        profile={oauthProfile}
      />
    </AuthPageShell>
  );
}

function getOAuthFlowErrorMessage(error: unknown): string {
  return error instanceof SocialOAuthPopupError
    ? getSocialOAuthErrorMessage(error.code)
    : getAuthErrorMessage(error);
}

function getSafeOAuthRedirectPath(
  redirectTo: string | null,
): string | undefined {
  if (!redirectTo || !/^\/(?!\/)[A-Za-z0-9/_:-]*$/.test(redirectTo)) {
    return undefined;
  }

  return redirectTo;
}

function getSafeRedirectPath(value: string | undefined, fallback: string): string {
  if (!value || !/^\/(?!\/)[A-Za-z0-9/_:-]*$/.test(value)) {
    return fallback;
  }

  return value;
}
