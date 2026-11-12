import { SystemText, useSystemMessages } from '@/features/platform/SystemText';
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
        <SystemText message={"Thử lại"} />
      </Button>
      <Link className="auth-recovery-actions__link" to="/">
        <SystemText message={"Về EduAI"} />
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
  const messageForUi = useSystemMessages();
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
          {<SystemText message={"Đăng nhập Google cần trình duyệt ngoài"} />}
        </h2>
        <p id="google-embedded-recovery-description">
          {`${messageForUi("Bạn đang mở EduAI trong trình duyệt của ")}${browserName}${messageForUi(". Vui lòng mở bằng Safari hoặc Chrome để tiếp tục đăng nhập Google.")}`}
        </p>
        <a
          className="auth-embedded-recovery__primary"
          href={getCurrentEduAiUrl()}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden="true" />
          <span>{<SystemText message={"Mở bằng Safari/Chrome"} />}</span>
        </a>
        <p className="auth-embedded-recovery__fallback">
          {<SystemText message={"Nếu không tự mở, nhấn ••• ở góc trên và chọn Mở bằng Safari/Chrome."} />}
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
