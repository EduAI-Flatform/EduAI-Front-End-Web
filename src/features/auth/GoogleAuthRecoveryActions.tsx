import { ExternalLink, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";

interface GoogleAuthRecoveryActionsProps {
  onRetry: () => void;
}

export function GoogleAuthRecoveryActions({
  onRetry,
}: GoogleAuthRecoveryActionsProps) {
  return (
    <div className="auth-recovery-actions">
      <Button onClick={onRetry} size="sm" type="button" variant="outline">
        Thử lại
      </Button>
      <Link className="auth-recovery-actions__link" to="/">
        Về EduAI
      </Link>
    </div>
  );
}

function getCurrentEduAiUrl(): string {
  if (typeof window === "undefined") {
    return "/login";
  }

  return `${window.location.origin}${window.location.pathname}`;
}

export function GoogleEmbeddedBrowserRecovery() {
  const browserName = getEmbeddedBrowserName();

  return (
    <section
      aria-describedby="google-embedded-recovery-description"
      aria-labelledby="google-embedded-recovery-title"
      className="auth-embedded-recovery"
      role="status"
    >
      <span aria-hidden="true" className="auth-embedded-recovery__icon">
        <Info />
      </span>
      <div className="auth-embedded-recovery__content">
        <h2 id="google-embedded-recovery-title">
          {"\u0110\u0103ng nh\u1eadp Google c\u1ea7n tr\u00ecnh duy\u1ec7t ngo\u00e0i"}
        </h2>
        <p id="google-embedded-recovery-description">
          {`\u0042\u1ea1n \u0111ang m\u1edf EduAI trong tr\u00ecnh duy\u1ec7t c\u1ee7a ${browserName}. Vui l\u00f2ng m\u1edf b\u1eb1ng Safari ho\u1eb7c Chrome \u0111\u1ec3 ti\u1ebfp t\u1ee5c \u0111\u0103ng nh\u1eadp Google.`}
        </p>
        <a
          className="auth-embedded-recovery__primary"
          href={getCurrentEduAiUrl()}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden="true" />
          <span>{"M\u1edf b\u1eb1ng Safari/Chrome"}</span>
        </a>
        <p className="auth-embedded-recovery__fallback">
          {"N\u1ebfu kh\u00f4ng t\u1ef1 m\u1edf, nh\u1ea5n \u2022\u2022\u2022 \u1edf g\u00f3c tr\u00ean v\u00e0 ch\u1ecdn M\u1edf b\u1eb1ng Safari/Chrome."}
        </p>
      </div>
    </section>
  );
}

function getEmbeddedBrowserName(): string {
  if (typeof navigator === "undefined") {
    return "tr\u00ecnh duy\u1ec7t t\u00edch h\u1ee3p";
  }

  const userAgent = navigator.userAgent;

  if (/Zalo/i.test(userAgent)) {
    return "Zalo";
  }

  if (/Messenger/i.test(userAgent)) {
    return "Messenger";
  }

  if (/FBAN|FBAV|FBIOS|FB_IAB|FB4A/i.test(userAgent)) {
    return "Facebook";
  }

  return "tr\u00ecnh duy\u1ec7t t\u00edch h\u1ee3p";
}
