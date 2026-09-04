import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  authService,
  GoogleExternalBrowserRequiredError,
  GoogleRoleSelectionRequiredError,
  getAuthErrorMessage,
  getDefaultRouteForRoles,
  getGoogleAuthErrorMessage,
  getSocialOAuthErrorMessage,
  isEmbeddedBrowser,
  normalizeOAuthOnboardingResponse,
  reportGoogleOAuthFailure,
  SocialOAuthPopupError,
  type OAuthExchangeResponse,
  type OAuthOnboardingResponse,
  type OAuthSessionResponse,
  type OAuthProviderCapabilities,
  type RegistrationRole,
  type SocialOAuthProvider,
} from "../../services/auth.service";
import { setAuthSession } from "./auth-store";
import { AuthPageShell } from "./AuthPageShell";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { OAuthProfileCompletionDialog } from "./OAuthProfileCompletionDialog";
import { SocialRoleSelectionModal } from "./SocialRoleSelectionModal";
import { SocialOAuthButtons } from "./SocialOAuthButtons";
import { GoogleRoleSelectionModal } from "./GoogleRoleSelectionModal";
import {
  GoogleAuthRecoveryActions,
  GoogleEmbeddedBrowserRecovery,
} from "./GoogleAuthRecoveryActions";
import {
  AuthFormErrors,
  validateEmail,
  validatePassword,
} from "./auth-validation";
import "./auth.css";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
  const [showGoogleRecovery, setShowGoogleRecovery] = useState(false);
  const [showExternalBrowserAction, setShowExternalBrowserAction] =
    useState(() => isEmbeddedBrowser());
  const [roleSelectionError, setRoleSelectionError] =
    useState<GoogleRoleSelectionRequiredError | null>(null);
  const [oauthOnboarding, setOAuthOnboarding] =
    useState<OAuthOnboardingResponse | null>(null);
  const [oauthProfile, setOAuthProfile] =
    useState<OAuthOnboardingResponse | null>(null);
  const [isSocialOnboardingSubmitting, setIsSocialOnboardingSubmitting] =
    useState(false);
  const redirectTo = searchParams.get("redirectTo");

  const isAuthSubmitting =
    isSubmitting ||
    isGoogleSubmitting ||
    Boolean(oauthLoadingProvider) ||
    isSocialOnboardingSubmitting;

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
      password: validatePassword(password),
    };

    setErrors(nextErrors);
    setFormError("");
    setShowGoogleRecovery(false);

    if (nextErrors.email || nextErrors.password) {
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await authService.login({
        email: email.trim(),
        password,
      });
      setAuthSession(session);
      navigate(
        getSafeRedirectPath(
          redirectTo,
          getDefaultRouteForRoles(session.user.roles),
        ),
        { replace: true },
      );
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setFormError("");
    setShowGoogleRecovery(true);
    setShowExternalBrowserAction(false);
    setIsGoogleSubmitting(true);

    try {
      const session = await authService.loginWithGoogle();
      try {
        setAuthSession(session);
      } catch (error) {
        reportGoogleOAuthFailure(error, "session");
        throw error;
      }
      navigate(
        getSafeRedirectPath(
          redirectTo,
          getDefaultRouteForRoles(session.user.roles),
        ),
        { replace: true },
      );
    } catch (error) {
      if (error instanceof GoogleRoleSelectionRequiredError) {
        setRoleSelectionError(error);
        return;
      }

      setShowExternalBrowserAction(
        error instanceof GoogleExternalBrowserRequiredError,
      );
      setFormError(getGoogleAuthErrorMessage(error));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function handleRoleSelection(role: "student" | "instructor") {
    if (!roleSelectionError) {
      return;
    }

    setFormError("");
    setShowGoogleRecovery(true);
    setShowExternalBrowserAction(false);
    setIsGoogleSubmitting(true);

    try {
      const session = await roleSelectionError.retry(role);
      setRoleSelectionError(null);
      try {
        setAuthSession(session);
      } catch (error) {
        reportGoogleOAuthFailure(error, "session");
        throw error;
      }
      navigate(
        getSafeRedirectPath(
          redirectTo,
          getDefaultRouteForRoles(session.user.roles),
        ),
        { replace: true },
      );
    } catch (error) {
      setRoleSelectionError(null);
      setShowExternalBrowserAction(
        error instanceof GoogleExternalBrowserRequiredError,
      );
      setFormError(getGoogleAuthErrorMessage(error));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function cancelRoleSelection() {
    await roleSelectionError?.cancel();
    setRoleSelectionError(null);
  }

  async function handleSocialSignIn(provider: SocialOAuthProvider) {
    setFormError("");
    setShowGoogleRecovery(false);
    setShowExternalBrowserAction(false);
    setOAuthLoadingProvider(provider);

    try {
      const launch = authService.startSocialOAuth(provider, {
        mode: "login",
        redirectTo: getSafeOAuthRedirectPath(redirectTo),
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
    const onboarding = normalizeOAuthOnboardingResponse(result);
    if (onboarding) {
      setOAuthOnboarding(onboarding);
      if (onboarding.role && !onboarding.requiresEmail) {
        await completeSocialOnboarding(onboarding);
      } else if (onboarding.role) {
        setOAuthProfile(onboarding);
      }
      return;
    }

    if (result.kind === "session") {
      finishSocialSession(result);
    }
  }

  async function handleSocialOnboardingRoleSelection(
    selectedRole: RegistrationRole,
  ) {
    const onboarding = oauthOnboarding;
    if (!onboarding || onboarding.role) return;

    const nextOnboarding = { ...onboarding, role: selectedRole };
    setOAuthOnboarding(nextOnboarding);
    if (nextOnboarding.requiresEmail) {
      setOAuthProfile(nextOnboarding);
      return;
    }

    await completeSocialOnboarding(nextOnboarding);
  }

  async function completeSocialOnboarding(
    onboarding: OAuthOnboardingResponse,
  ) {
    if (!onboarding.role) return;

    setFormError("");
    setIsSocialOnboardingSubmitting(true);
    try {
      const result = await authService.completeOAuthProfile({
        role: onboarding.role,
        ticket: onboarding.ticket,
      });
      setOAuthProfile(null);
      setOAuthOnboarding(null);
      finishSocialSession(result);
    } catch (error) {
      setOAuthProfile(null);
      setOAuthOnboarding(null);
      setFormError(getOAuthFlowErrorMessage(error));
    } finally {
      setIsSocialOnboardingSubmitting(false);
    }
  }

  function cancelSocialOnboarding() {
    setOAuthProfile(null);
    setOAuthOnboarding(null);
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
      description="Đăng nhập để tiếp tục hành trình học tập của bạn."
      mode="login"
      title="Chào mừng trở lại"
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
          <label className="auth-field" htmlFor="login-email">
            Email
            <Input
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              className="auth-input"
              disabled={isAuthSubmitting}
              id="login-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              type="email"
              value={email}
            />
            {errors.email ? (
              <span className="auth-field__error">{errors.email}</span>
            ) : null}
          </label>

          <label className="auth-field" htmlFor="login-password">
            Mật khẩu
            <span className="auth-field__input-wrap">
              <Input
                aria-invalid={Boolean(errors.password)}
                autoComplete="current-password"
                className="auth-input auth-input--with-icon"
                disabled={isAuthSubmitting}
                id="login-password"
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
        </div>

        <label className="auth-checkbox-row">
          <input className="auth-checkbox" type="checkbox" />
          Ghi nhớ đăng nhập
        </label>

        <Button
          className="auth-submit-button"
          disabled={isAuthSubmitting}
          type="submit"
        >
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          <ArrowRight aria-hidden="true" className="auth-submit-button__icon" />
        </Button>

        <>
          <div className="auth-divider">Hoặc đăng nhập bằng</div>

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
                disabled={isSubmitting || isGoogleSubmitting}
                loadingProvider={oauthLoadingProvider}
                onSelect={(provider) => {
                  void handleSocialSignIn(provider);
                }}
              />
          </div>
        </>

        <p className="auth-switch-copy">
          Chưa có tài khoản?{" "}
          <Link className="auth-switch-link" to="/register">
            Đăng ký ngay
          </Link>
        </p>
      </form>
      <GoogleRoleSelectionModal
        error={roleSelectionError}
        isSubmitting={isGoogleSubmitting}
        onCancel={() => {
          void cancelRoleSelection();
        }}
        onConfirm={handleRoleSelection}
      />
      <SocialRoleSelectionModal
        isSubmitting={isSocialOnboardingSubmitting}
        onCancel={cancelSocialOnboarding}
        onConfirm={handleSocialOnboardingRoleSelection}
        provider={
          oauthOnboarding && !oauthOnboarding.role
            ? oauthOnboarding.provider
            : null
        }
      />
      <OAuthProfileCompletionDialog
        onCancel={cancelSocialOnboarding}
        onComplete={async (profile, input) => {
          const result = await authService.completeOAuthProfile({
            ...input,
            ticket: profile.ticket,
          });
          setOAuthProfile(null);
          setOAuthOnboarding(null);
          finishSocialSession(result);
        }}
        profile={oauthProfile}
        role={oauthProfile?.role ?? null}
      />
    </AuthPageShell>
  );
}

function getOAuthFlowErrorMessage(error: unknown): string {
  return error instanceof SocialOAuthPopupError
    ? getSocialOAuthErrorMessage(error.code)
    : getAuthErrorMessage(error);
}

function getSafeRedirectPath(redirectTo: string | null, fallback = "/"): string {
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return fallback;
  }

  return redirectTo;
}

function getSafeOAuthRedirectPath(
  redirectTo: string | null,
): string | undefined {
  if (!redirectTo || !/^\/(?!\/)[A-Za-z0-9/_:-]*$/.test(redirectTo)) {
    return undefined;
  }

  return redirectTo;
}
