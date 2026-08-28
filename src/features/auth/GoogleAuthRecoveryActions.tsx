import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";

interface GoogleAuthRecoveryActionsProps {
  onRetry: () => void;
  showExternalBrowserAction: boolean;
}

export function GoogleAuthRecoveryActions({
  onRetry,
  showExternalBrowserAction,
}: GoogleAuthRecoveryActionsProps) {
  return (
    <div className="auth-recovery-actions">
      <Button onClick={onRetry} size="sm" type="button" variant="outline">
        Thử lại
      </Button>
      {showExternalBrowserAction ? (
        <a
          className="auth-recovery-actions__link"
          href={getCurrentEduAiUrl()}
          rel="noopener noreferrer"
          target="_blank"
        >
          Mở trong trình duyệt
        </a>
      ) : null}
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
