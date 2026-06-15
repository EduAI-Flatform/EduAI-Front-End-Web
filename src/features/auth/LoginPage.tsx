import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  authService,
  getAuthErrorMessage,
  saveAuthSession,
} from "../../services/auth.service";
import { AuthPageShell } from "./AuthPageShell";
import {
  AuthFormErrors,
  validateEmail,
  validatePassword,
} from "./auth-validation";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      saveAuthSession(session);
      navigate("/");
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      description="Đăng nhập để tiếp tục hành trình học tập của bạn."
      mode="login"
      title="Chào mừng trở lại"
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

        <div className="grid gap-4">
          <label
            className="grid gap-2 text-xs font-semibold text-[#424754]"
            htmlFor="login-email"
          >
            Email
            <Input
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              className="h-10 border-[#d8ddea] bg-white text-sm"
              disabled={isSubmitting}
              id="login-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              type="email"
              value={email}
            />
            {errors.email ? (
              <span className="text-xs font-medium text-red-600">
                {errors.email}
              </span>
            ) : null}
          </label>

          <label
            className="grid gap-2 text-xs font-semibold text-[#424754]"
            htmlFor="login-password"
          >
            <span className="flex items-center justify-between">
              Mật khẩu
              <Link
                className="text-xs font-semibold text-[#0058be] hover:underline"
                to="/login"
              >
                Quên mật khẩu?
              </Link>
            </span>
            <span className="relative">
              <Input
                aria-invalid={Boolean(errors.password)}
                autoComplete="current-password"
                className="h-10 border-[#d8ddea] bg-white pr-10 text-sm"
                disabled={isSubmitting}
                id="login-password"
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
        </div>

        <label className="mt-4 flex items-center gap-2 text-xs font-medium text-[#424754]">
          <input className="h-4 w-4 rounded border-[#d8ddea]" type="checkbox" />
          Ghi nhớ đăng nhập
        </label>

        <Button
          className="mt-5 w-full bg-gradient-to-r from-[#0058be] to-[#6b38d4] hover:opacity-95"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>

        <div className="my-7 flex items-center gap-3 text-xs text-[#727785]">
          <span className="h-px flex-1 bg-[#e3e6f3]" />
          Hoặc đăng nhập bằng
          <span className="h-px flex-1 bg-[#e3e6f3]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline">
            Google
          </Button>
          <Button type="button" variant="outline">
            Facebook
          </Button>
        </div>

        <p className="mt-7 text-center text-sm text-[#424754]">
          Chưa có tài khoản?{" "}
          <Link
            className="font-semibold text-[#0058be] hover:underline"
            to="/register"
          >
            Đăng ký ngay
          </Link>
        </p>
      </form>
    </AuthPageShell>
  );
}
