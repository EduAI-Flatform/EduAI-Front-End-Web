import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, LoaderCircle, Mail, UserRound } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  authService,
  getAuthErrorMessage,
  getDefaultRouteForRoles,
  getSocialOAuthErrorMessage,
  type OAuthProfileRequiredResponse,
  type OAuthSessionResponse,
  type SocialOAuthProvider,
} from "../../services/auth.service";
import { validateEmail } from "./auth-validation";
import { setAuthSession } from "./auth-store";
import { AuthPageShell } from "./AuthPageShell";
import "./auth.css";
import "./OAuthCallbackPage.css";

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startedRef = useRef(false);
  const [profile, setProfile] = useState<OAuthProfileRequiredResponse | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ticket = searchParams.get("ticket");
  const callbackError = searchParams.get("error");
  const provider = getProvider(searchParams.get("provider"));

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    if (callbackError) {
      setError(getSocialOAuthErrorMessage(callbackError));
      setIsLoading(false);
      return;
    }

    if (!ticket) {
      setError(getSocialOAuthErrorMessage("OAUTH_CALLBACK_FAILED"));
      setIsLoading(false);
      return;
    }

    clearTicketFromUrl();
    void exchangeTicket(ticket);
  }, [callbackError, ticket]);

  async function exchangeTicket(value: string) {
    try {
      const result = await authService.exchangeOAuthTicket(value);

      if (result.kind === "session") {
        finishSession(result);
        return;
      }

      setProfile(result);
      setFullName(result.displayName ?? "");
      setIsLoading(false);
    } catch (exchangeError) {
      setError(getAuthErrorMessage(exchangeError));
      setIsLoading(false);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || isSubmitting) {
      return;
    }

    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    setError("");

    if (nextEmailError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authService.completeOAuthProfile({
        email: email.trim(),
        ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
        ticket: profile.ticket,
      });
      finishSession(result);
    } catch (completionError) {
      setError(getAuthErrorMessage(completionError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function finishSession(result: OAuthSessionResponse) {
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
      setError(getAuthErrorMessage(sessionError));
      setIsLoading(false);
    }
  }

  const title = profile ? "Hoàn tất hồ sơ EduAI" : "Đang xác thực";
  const description = profile
    ? "Chỉ còn một bước để tạo tài khoản và bắt đầu học cùng EduAI."
    : `Đang hoàn tất đăng nhập${provider ? ` với ${providerLabel(provider)}` : ""}...`;

  return (
    <AuthPageShell description={description} mode="login" title={title}>
      {isLoading ? (
        <section
          aria-live="polite"
          className="auth-oauth-state-card"
          role="status"
        >
          <LoaderCircle aria-hidden="true" className="auth-oauth-state-card__spinner" />
          <p>Đang bảo mật phiên đăng nhập của bạn...</p>
        </section>
      ) : profile ? (
        <form
          className="auth-form-card auth-oauth-profile-card"
          noValidate
          onSubmit={handleProfileSubmit}
        >
          <div className="auth-oauth-profile-card__intro">
            <span className="auth-oauth-profile-card__icon">
              <CheckCircle2 aria-hidden="true" />
            </span>
            <div>
              <h2>Thêm email để tiếp tục</h2>
              <p>
                {profile.displayName
                  ? `Xin chào ${profile.displayName}! Email giúp EduAI bảo vệ và khôi phục tài khoản của bạn.`
                  : "Email giúp EduAI bảo vệ và khôi phục tài khoản của bạn."}
              </p>
            </div>
          </div>

          {error ? (
            <div className="auth-alert auth-alert--error" role="alert">
              <AlertCircle aria-hidden="true" className="auth-alert__icon" />
              <p>{error}</p>
            </div>
          ) : null}

          <label className="auth-field" htmlFor="oauth-profile-email">
            Email
            <span className="auth-field__input-wrap">
              <Mail aria-hidden="true" className="auth-field__leading-icon" />
              <Input
                aria-invalid={Boolean(emailError)}
                autoComplete="email"
                className="auth-input auth-input--with-leading-icon"
                disabled={isSubmitting}
                id="oauth-profile-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                type="email"
                value={email}
              />
            </span>
            {emailError ? <span className="auth-field__error">{emailError}</span> : null}
          </label>

          <label className="auth-field" htmlFor="oauth-profile-name">
            Họ và tên <span className="auth-oauth-profile-card__optional">(tuỳ chọn)</span>
            <span className="auth-field__input-wrap">
              <UserRound aria-hidden="true" className="auth-field__leading-icon" />
              <Input
                autoComplete="name"
                className="auth-input auth-input--with-leading-icon"
                disabled={isSubmitting}
                id="oauth-profile-name"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nguyễn Văn A"
                value={fullName}
              />
            </span>
          </label>

          <Button className="auth-submit-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <LoaderCircle aria-hidden="true" className="auth-oauth-state-card__spinner" />
            ) : null}
            {isSubmitting ? "Đang tạo tài khoản..." : "Hoàn tất đăng ký"}
          </Button>
        </form>
      ) : (
        <section
          aria-live="polite"
          className="auth-oauth-state-card auth-oauth-state-card--error"
          role="alert"
        >
          <AlertCircle aria-hidden="true" className="auth-oauth-state-card__error-icon" />
          <p>{error}</p>
          <Link className="auth-oauth-state-card__link" to="/login">
            Quay lại đăng nhập
          </Link>
        </section>
      )}
    </AuthPageShell>
  );
}

function clearTicketFromUrl(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.hash}`,
  );
}

function getProvider(value: string | null): SocialOAuthProvider | null {
  return value === "facebook" || value === "zalo" ? value : null;
}

function providerLabel(provider: SocialOAuthProvider): string {
  return provider === "facebook" ? "Facebook" : "Zalo";
}

function getSafeRedirectPath(value: string | undefined, fallback: string): string {
  if (!value || !/^\/(?!\/)[A-Za-z0-9/_:-]*$/.test(value)) {
    return fallback;
  }

  return value;
}
