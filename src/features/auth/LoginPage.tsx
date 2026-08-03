import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  authService,
  getAuthErrorMessage,
  getDefaultRouteForRoles,
  getGoogleAuthErrorMessage,
} from "../../services/auth.service";
import { setAuthSession } from "./auth-store";
import { AuthPageShell } from "./AuthPageShell";
import { GoogleSignInButton } from "./GoogleSignInButton";
import {
  AuthFormErrors,
  validateEmail,
  validatePassword,
} from "./auth-validation";
import "./auth.css";
import "./LoginPage.css";

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

  const isAuthSubmitting = isSubmitting || isGoogleSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };

    setErrors(nextErrors);
    setFormError("");

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
          searchParams.get("redirectTo"),
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
    setIsGoogleSubmitting(true);

    try {
      const session = await authService.loginWithGoogle();
      setAuthSession(session);
      navigate(
        getSafeRedirectPath(
          searchParams.get("redirectTo"),
          getDefaultRouteForRoles(session.user.roles),
        ),
        { replace: true },
      );
    } catch (error) {
      setFormError(getGoogleAuthErrorMessage(error));
    } finally {
      setIsGoogleSubmitting(false);
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
        {formError ? (
          <div className="auth-alert auth-alert--error">
            <AlertCircle aria-hidden="true" className="auth-alert__icon" />
            <p>{formError}</p>
          </div>
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
            <span className="auth-field__label-row">
              Mật khẩu
              <Link className="auth-field__link" to="/login">
                Quên mật khẩu?
              </Link>
            </span>
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

        <div className="auth-divider">Hoặc đăng nhập bằng</div>

        <div className="auth-social-grid">
          <GoogleSignInButton
            disabled={isSubmitting}
            isLoading={isGoogleSubmitting}
            onClick={handleGoogleSignIn}
          />
        </div>

        <p className="auth-switch-copy">
          Chưa có tài khoản?{" "}
          <Link className="auth-switch-link" to="/register">
            Đăng ký ngay
          </Link>
        </p>
      </form>
    </AuthPageShell>
  );
}

function getSafeRedirectPath(redirectTo: string | null, fallback = "/"): string {
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return fallback;
  }

  return redirectTo;
}
