import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, CheckCircle2, Eye } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { authService, getAuthErrorMessage } from "../../services/auth.service";
import { AuthPageShell } from "./AuthPageShell";
import {
  AuthFormErrors,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordConfirmation,
} from "./auth-validation";
import "./auth.css";
import "./RegisterPage.css";

export function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(email),
      fullName: validateFullName(fullName),
      password: validatePassword(password),
      confirmPassword: validatePasswordConfirmation(password, confirmPassword),
    };

    setErrors(nextErrors);
    setFormError("");
    setSuccessMessage("");

    if (
      nextErrors.email ||
      nextErrors.fullName ||
      nextErrors.password ||
      nextErrors.confirmPassword
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.register({
        email: email.trim(),
        fullName: fullName.trim(),
        password,
      });
      setSuccessMessage("Tài khoản đã được tạo. Bạn có thể đăng nhập ngay.");
      window.setTimeout(() => navigate("/login"), 700);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      description="Tạo tài khoản miễn phí và truy cập kho kiến thức AI không giới hạn hôm nay."
      mode="register"
      title="Bắt đầu hành trình"
    >
      <form className="auth-form-card" noValidate onSubmit={handleSubmit}>
        {formError ? (
          <div className="auth-alert auth-alert--error">
            <AlertCircle aria-hidden="true" className="auth-alert__icon" />
            <p>{formError}</p>
          </div>
        ) : null}

        {successMessage ? (
          <div className="auth-alert auth-alert--success">
            <CheckCircle2 aria-hidden="true" className="auth-alert__icon" />
            <p>{successMessage}</p>
          </div>
        ) : null}

        <div className="auth-field-grid">
          <label className="auth-field" htmlFor="register-name">
            Họ và tên
            <Input
              aria-invalid={Boolean(errors.fullName)}
              autoComplete="name"
              className="auth-input"
              disabled={isSubmitting}
              id="register-name"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              value={fullName}
            />
            {errors.fullName ? (
              <span className="auth-field__error">{errors.fullName}</span>
            ) : null}
          </label>

          <label className="auth-field" htmlFor="register-email">
            Địa chỉ Email
            <Input
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              className="auth-input"
              disabled={isSubmitting}
              id="register-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              type="email"
              value={email}
            />
            {errors.email ? (
              <span className="auth-field__error">{errors.email}</span>
            ) : null}
          </label>

          <div className="auth-field-grid auth-field-grid--two">
            <label className="auth-field" htmlFor="register-password">
              Mật khẩu
              <span className="auth-field__input-wrap">
                <Input
                  aria-invalid={Boolean(errors.password)}
                  autoComplete="new-password"
                  className="auth-input auth-input--with-icon"
                  disabled={isSubmitting}
                  id="register-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  type="password"
                  value={password}
                />
                <Eye aria-hidden="true" className="auth-field__icon" />
              </span>
              {errors.password ? (
                <span className="auth-field__error">{errors.password}</span>
              ) : null}
            </label>

            <label className="auth-field" htmlFor="register-confirm-password">
              Xác nhận
              <span className="auth-field__input-wrap">
                <Input
                  aria-invalid={Boolean(errors.confirmPassword)}
                  autoComplete="new-password"
                  className="auth-input auth-input--with-icon"
                  disabled={isSubmitting}
                  id="register-confirm-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  type="password"
                  value={confirmPassword}
                />
                <Eye aria-hidden="true" className="auth-field__icon" />
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
          Tôi đồng ý với điều khoản và chính sách bảo mật của AILearn.
        </label>

        <Button
          className="auth-submit-button"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          <ArrowRight aria-hidden="true" className="auth-submit-button__icon" />
        </Button>

        <div className="auth-divider">Hoặc đăng ký với</div>

        <div className="auth-social-grid">
          <Button className="auth-social-button" type="button" variant="outline">
            Google
          </Button>
          <Button className="auth-social-button" type="button" variant="outline">
            LinkedIn
          </Button>
        </div>

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
