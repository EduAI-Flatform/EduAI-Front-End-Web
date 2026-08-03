import { LoaderCircle } from "lucide-react";
import { Button } from "../../components/ui/button";

interface GoogleSignInButtonProps {
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

export function GoogleSignInButton({
  disabled = false,
  isLoading = false,
  onClick,
}: GoogleSignInButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <Button
      aria-busy={isLoading}
      className="auth-social-button auth-google-button"
      disabled={isDisabled}
      onClick={onClick}
      type="button"
      variant="outline"
    >
      {isLoading ? (
        <LoaderCircle
          aria-hidden="true"
          className="auth-google-button__icon auth-google-button__spinner"
        />
      ) : (
        <GoogleIcon />
      )}
      <span>
        {isLoading ? "Đang kết nối với Google..." : "Tiếp tục với Google"}
      </span>
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="auth-google-button__icon"
      viewBox="0 0 24 24"
    >
      <path
        d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.26Z"
        fill="#4285F4"
      />
      <path
        d="M12 21.6c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.74 9.74 0 0 0 12 21.6Z"
        fill="#34A853"
      />
      <path
        d="M6.53 13.69a5.86 5.86 0 0 1 0-3.38V7.78H3.29a9.74 9.74 0 0 0 0 8.44l3.24-2.53Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.28c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.39 14.63 2.4 12 2.4a9.74 9.74 0 0 0-8.71 5.38l3.24 2.53C7.3 8 9.46 6.28 12 6.28Z"
        fill="#EA4335"
      />
    </svg>
  );
}
