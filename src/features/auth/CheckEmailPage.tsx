import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, LoaderCircle, MailCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  authService,
  getAuthErrorMessage,
  getPendingEmailVerification,
} from "../../services/auth.service";
import { AuthPageShell } from "./AuthPageShell";
import "./auth.css";
import "./CheckEmailPage.css";

const RESEND_COOLDOWN_SECONDS = 60;

export function CheckEmailPage() {
  const pendingVerification = getPendingEmailVerification();
  const [cooldown, setCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleResend() {
    if (isSubmitting || cooldown > 0) {
      return;
    }

    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await authService.resendVerificationEmail();
      setMessage("Email xác minh đã được gửi lại. Vui lòng kiểm tra hộp thư và Thư rác.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (resendError) {
      setError(getAuthErrorMessage(resendError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      description="Xác minh email để hoàn tất đăng ký và bắt đầu học cùng EduAI."
      mode="login"
      title="Kiểm tra email của bạn"
    >
      <section className="check-email-card" aria-live="polite">
        <div className="check-email-card__icon">
          <MailCheck aria-hidden="true" />
        </div>
        <h2>Chúng tôi đã gửi email xác minh</h2>
        <p>
          {pendingVerification?.email
            ? `Hãy mở email gửi đến ${pendingVerification.email} và làm theo hướng dẫn.`
            : "Hãy mở email xác minh và làm theo hướng dẫn để tiếp tục."}
        </p>
        <p className="check-email-card__hint">
          Nếu không thấy email, hãy kiểm tra mục Thư rác hoặc Quảng cáo.
        </p>

        {error ? (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle aria-hidden="true" className="auth-alert__icon" />
            <p>{error}</p>
          </div>
        ) : null}
        {message ? (
          <div className="auth-alert auth-alert--success" role="status">
            <CheckCircle2 aria-hidden="true" className="auth-alert__icon" />
            <p>{message}</p>
          </div>
        ) : null}

        <Button
          className="check-email-card__resend"
          disabled={isSubmitting || cooldown > 0}
          onClick={() => void handleResend()}
          type="button"
        >
          {isSubmitting ? <LoaderCircle aria-hidden="true" className="check-email-card__spinner" /> : null}
          {cooldown > 0
            ? `Gửi lại email sau ${cooldown}s`
            : isSubmitting
              ? "Đang gửi email..."
              : "Gửi lại email xác minh"}
        </Button>

        <Link className="check-email-card__login" to="/login">
          Quay lại đăng nhập
        </Link>
      </section>
    </AuthPageShell>
  );
}
