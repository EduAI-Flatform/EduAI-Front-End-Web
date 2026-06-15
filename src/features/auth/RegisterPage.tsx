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
      <form
        className="rounded-2xl border border-[#e3e6f3] bg-white p-5 shadow-sm"
        noValidate
        onSubmit={handleSubmit}
      >
        {formError ? (
          <div className="mb-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <p>{formError}</p>
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-4 flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <p>{successMessage}</p>
          </div>
        ) : null}

        <div className="grid gap-4">
          <label
            className="grid gap-2 text-xs font-semibold text-[#424754]"
            htmlFor="register-name"
          >
            Họ và tên
            <Input
              aria-invalid={Boolean(errors.fullName)}
              autoComplete="name"
              className="h-10 border-[#d8ddea] bg-white text-sm"
              disabled={isSubmitting}
              id="register-name"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              value={fullName}
            />
            {errors.fullName ? (
              <span className="text-xs font-medium text-red-600">
                {errors.fullName}
              </span>
            ) : null}
          </label>

          <label
            className="grid gap-2 text-xs font-semibold text-[#424754]"
            htmlFor="register-email"
          >
            Địa chỉ Email
            <Input
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              className="h-10 border-[#d8ddea] bg-white text-sm"
              disabled={isSubmitting}
              id="register-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              type="email"
              value={email}
            />
            {errors.email ? (
              <span className="text-xs font-medium text-red-600">
                {errors.email}
              </span>
            ) : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label
              className="grid gap-2 text-xs font-semibold text-[#424754]"
              htmlFor="register-password"
            >
              Mật khẩu
              <span className="relative">
                <Input
                  aria-invalid={Boolean(errors.password)}
                  autoComplete="new-password"
                  className="h-10 border-[#d8ddea] bg-white pr-9 text-sm"
                  disabled={isSubmitting}
                  id="register-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  type="password"
                  value={password}
                />
                <Eye
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#727785]"
                />
              </span>
              {errors.password ? (
                <span className="text-xs font-medium text-red-600">
                  {errors.password}
                </span>
              ) : null}
            </label>

            <label
              className="grid gap-2 text-xs font-semibold text-[#424754]"
              htmlFor="register-confirm-password"
            >
              Xác nhận
              <span className="relative">
                <Input
                  aria-invalid={Boolean(errors.confirmPassword)}
                  autoComplete="new-password"
                  className="h-10 border-[#d8ddea] bg-white pr-9 text-sm"
                  disabled={isSubmitting}
                  id="register-confirm-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  type="password"
                  value={confirmPassword}
                />
                <Eye
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#727785]"
                />
              </span>
              {errors.confirmPassword ? (
                <span className="text-xs font-medium text-red-600">
                  {errors.confirmPassword}
                </span>
              ) : null}
            </label>
          </div>
        </div>

        <label className="mt-4 flex items-start gap-2 text-xs font-medium leading-5 text-[#424754]">
          <input
            className="mt-0.5 h-4 w-4 rounded border-[#d8ddea]"
            type="checkbox"
          />
          Tôi đồng ý với điều khoản và chính sách bảo mật của AILearn.
        </label>

        <Button
          className="mt-5 w-full bg-gradient-to-r from-[#0058be] to-[#6b38d4] hover:opacity-95"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>

        <div className="my-7 flex items-center gap-3 text-xs text-[#727785]">
          <span className="h-px flex-1 bg-[#e3e6f3]" />
          Hoặc đăng ký với
          <span className="h-px flex-1 bg-[#e3e6f3]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline">
            Google
          </Button>
          <Button type="button" variant="outline">
            LinkedIn
          </Button>
        </div>

        <p className="mt-7 text-center text-sm text-[#424754]">
          Bạn đã có tài khoản?{" "}
          <Link
            className="font-semibold text-[#0058be] hover:underline"
            to="/login"
          >
            Đăng nhập ngay
          </Link>
        </p>
      </form>
    </AuthPageShell>
  );
}
