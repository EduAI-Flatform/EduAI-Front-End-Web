import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Presentation,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  authService,
  getAuthErrorMessage,
  getDefaultRouteForRoles,
  type RegistrationRole,
} from "../../services/auth.service";
import { AuthPageShell } from "./AuthPageShell";
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
    description: "Tham gia khóa học, theo dõi tiến độ và nhận chứng chỉ.",
    icon: GraduationCap,
    label: "Học sinh",
    value: "student",
  },
  {
    description: "Tạo khóa học, quản lý bài học và lớp học trực tuyến.",
    icon: Presentation,
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
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setSuccessMessage("");

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
      const response = await authService.register({
        email: email.trim(),
        fullName: fullName.trim(),
        password,
        role,
      });
      const redirectTo = getDefaultRouteForRoles(response.user.roles);

      setSuccessMessage("Tài khoản đã được tạo. Vui lòng đăng nhập để tiếp tục.");
      window.setTimeout(
        () => navigate(`/login?redirectTo=${encodeURIComponent(redirectTo)}`),
        700,
      );
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      description="Chọn vai trò học tập hoặc giảng dạy để EduAI chuẩn bị không gian phù hợp cho bạn."
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
          <fieldset className="register-role-field">
            <legend>Bạn muốn sử dụng EduAI với vai trò nào?</legend>
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
                    disabled={isSubmitting}
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
            Địa chỉ email
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
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={isPasswordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={isPasswordVisible}
                  className="auth-field__password-toggle"
                  disabled={isSubmitting}
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
                <Input
                  aria-invalid={Boolean(errors.confirmPassword)}
                  autoComplete="new-password"
                  className="auth-input auth-input--with-icon"
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
