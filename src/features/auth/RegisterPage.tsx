import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  IdCard,
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
  isEmbeddedBrowser,
  type RegistrationRole,
} from "../../services/auth.service";
import { setAuthSession } from "./auth-store";
import { AuthPageShell } from "./AuthPageShell";
import { GoogleSignInButton } from "./GoogleSignInButton";
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

const roleOptions: Array<{
  description: string;
  icon: typeof GraduationCap;
  label: string;
  value: RegistrationRole;
}> = [
  {
    description: "Khám phá tri thức",
    icon: GraduationCap,
    label: "Học viên",
    value: "student",
  },
  {
    description: "Chia sẻ kiến thức",
    icon: IdCard,
    label: "Giảng viên",
    value: "instructor",
  },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RegistrationRole>("student");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showExternalBrowserAction, setShowExternalBrowserAction] =
    useState(() => isEmbeddedBrowser());

  const isAuthSubmitting = isSubmitting || isGoogleSubmitting;

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

  async function handleGoogleSignIn() {
    setFormError("");
    setShowExternalBrowserAction(false);
    setIsGoogleSubmitting(true);

    try {
      const session = await authService.registerWithGoogle(role);
      setAuthSession(session);
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
                <GoogleAuthRecoveryActions
                  onRetry={() => {
                    void handleGoogleSignIn();
                  }}
                />
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

        {!showExternalBrowserAction ? (
          <>
            <div className="auth-divider">Hoặc đăng ký với</div>

            <div className="auth-social-grid">
              <GoogleSignInButton
                disabled={isSubmitting}
                isLoading={isGoogleSubmitting}
                onClick={handleGoogleSignIn}
              />
            </div>
          </>
        ) : null}

        <p className="auth-switch-copy">
          Bạn đã có tài khoản?{" "}
          <Link className="auth-switch-link" to="/login">
            Đăng nhập ngay
          </Link>
        </p>
      </form>
    </AuthPageShell>
  );
}
