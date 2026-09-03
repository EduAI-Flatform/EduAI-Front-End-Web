import { LoaderCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  type OAuthProviderCapabilities,
  type SocialOAuthProvider,
} from "../../services/auth.service";

interface SocialOAuthButtonsProps {
  capabilities: OAuthProviderCapabilities;
  disabled?: boolean;
  loadingProvider?: SocialOAuthProvider | null;
  onSelect: (provider: SocialOAuthProvider) => void;
}

export function SocialOAuthButtons({
  capabilities,
  disabled = false,
  loadingProvider = null,
  onSelect,
}: SocialOAuthButtonsProps) {
  const providers: SocialOAuthProvider[] = ["facebook", "zalo"];
  const enabledProviders = providers.filter((provider) => capabilities[provider]);

  if (enabledProviders.length === 0) {
    return null;
  }

  return (
    <div className="auth-social-provider-grid">
      {enabledProviders.map((provider) => {
        const isLoading = loadingProvider === provider;
        const label =
          provider === "facebook"
            ? "Ti\u1ebfp t\u1ee5c v\u1edbi Facebook"
            : "Ti\u1ebfp t\u1ee5c v\u1edbi Zalo";

        return (
          <Button
            aria-busy={isLoading}
            aria-label={isLoading ? `Đang kết nối với ${providerLabel(provider)}` : label}
            className={`auth-social-button auth-${provider}-button`}
            disabled={disabled || Boolean(loadingProvider)}
            key={provider}
            onClick={() => onSelect(provider)}
            type="button"
            variant="outline"
          >
            {isLoading ? (
              <LoaderCircle
                aria-hidden="true"
                className="auth-social-provider-button__icon auth-social-provider-button__spinner"
              />
            ) : provider === "facebook" ? (
              <FacebookIcon />
            ) : (
              <ZaloIcon />
            )}
            <span>{isLoading ? "\u0110ang k\u1ebft n\u1ed1i..." : label}</span>
          </Button>
        );
      })}
    </div>
  );
}

function providerLabel(provider: SocialOAuthProvider): string {
  return provider === "facebook" ? "Facebook" : "Zalo";
}

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      className="auth-social-provider-button__icon"
      viewBox="0 0 24 24"
    >
      <path
        d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V4a22 22 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3V10H7.4v3h2.7v8h3.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ZaloIcon() {
  return (
    <svg
      aria-hidden="true"
      className="auth-social-provider-button__icon"
      viewBox="0 0 24 24"
    >
      <rect fill="currentColor" height="18" rx="5" width="18" x="3" y="3" />
      <path
        d="M7.2 8.1h6.1v2.2l-3.3 3.5h3.5v2.2H7v-2.2l3.3-3.5H7.2V8.1Zm8.2 0h2.2v7.9h-2.2V8.1Z"
        fill="#fff"
      />
    </svg>
  );
}
