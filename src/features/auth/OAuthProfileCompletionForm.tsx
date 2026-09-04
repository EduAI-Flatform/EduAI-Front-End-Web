import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Mail, UserRound } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  getAuthErrorMessage,
  type OAuthProfileRequiredResponse,
} from "../../services/auth.service";
import { validateEmail } from "./auth-validation";

export interface OAuthProfileCompletionInput {
  email: string;
  fullName?: string;
}

interface OAuthProfileCompletionFormProps {
  className?: string;
  onComplete: (input: OAuthProfileCompletionInput) => Promise<void>;
  profile: OAuthProfileRequiredResponse;
  submitLabel?: string;
}

export function OAuthProfileCompletionForm({
  className = "auth-form-card auth-oauth-profile-card",
  onComplete,
  profile,
  submitLabel = "Hoàn tất đăng ký",
}: OAuthProfileCompletionFormProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState(profile.displayName ?? "");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setEmail("");
    setFullName(profile.displayName ?? "");
    setEmailError(undefined);
    setError("");
  }, [profile.ticket, profile.displayName]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    setError("");
    if (nextEmailError) return;

    setIsSubmitting(true);
    try {
      await onComplete({
        email: email.trim(),
        ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
      });
    } catch (completionError) {
      setError(getAuthErrorMessage(completionError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={className} noValidate onSubmit={handleSubmit}>
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
        {isSubmitting ? "Đang tạo tài khoản..." : submitLabel}
      </Button>
    </form>
  );
}
