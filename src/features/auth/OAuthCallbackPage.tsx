import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, LoaderCircle } from "lucide-react";
import {
  authService,
  getAuthErrorMessage,
  getDefaultRouteForRoles,
  getSocialOAuthErrorMessage,
  type OAuthExchangeResponse,
  type OAuthProfileRequiredResponse,
  type OAuthSessionResponse,
  type SocialOAuthProvider,
} from "../../services/auth.service";
import {
  getSafeOAuthPopupErrorCode,
  isSafeOAuthPopupTicket,
  isOAuthPopupWindow,
  OAUTH_POPUP_COMPLETE_MESSAGE,
  OAUTH_POPUP_ERROR_MESSAGE,
  postOAuthPopupMessage,
} from "../../services/social-oauth-popup";
import { AuthPageShell } from "./AuthPageShell";
import { OAuthProfileCompletionForm } from "./OAuthProfileCompletionForm";
import { setAuthSession } from "./auth-store";
import "./auth.css";
import "./OAuthCallbackPage.css";

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startedRef = useRef(false);
  const [profile, setProfile] = useState<OAuthProfileRequiredResponse | null>(
    null,
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [popupHandoff, setPopupHandoff] = useState(false);

  const ticket = searchParams.get("ticket");
  const callbackError = searchParams.get("error");
  const provider = getProvider(searchParams.get("provider"));

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (isOAuthPopupWindow()) {
      clearTicketFromUrl();

      const handedOff = provider
        ? callbackError
          ? postOAuthPopupMessage(
              {
                type: OAUTH_POPUP_ERROR_MESSAGE,
                provider,
                error: getSafeOAuthPopupErrorCode(callbackError),
              },
              window,
            )
          : isSafeOAuthPopupTicket(ticket)
            ? postOAuthPopupMessage(
                {
                  type: OAUTH_POPUP_COMPLETE_MESSAGE,
                  provider,
                  ticket,
                },
                window,
              )
            : postOAuthPopupMessage(
                {
                  type: OAUTH_POPUP_ERROR_MESSAGE,
                  provider,
                  error: "OAUTH_CALLBACK_FAILED",
                },
                window,
              )
        : false;

      if (handedOff) {
        setPopupHandoff(true);
        setIsLoading(false);
        try {
          window.close();
        } catch {
          // Some browsers refuse close() for a window they did not script.
        }
        return;
      }
    }

    if (callbackError) {
      setError(getSocialOAuthErrorMessage(callbackError));
      setIsLoading(false);
      return;
    }

    if (!ticket) {
      setError(getSocialOAuthErrorMessage("OAUTH_CALLBACK_FAILED"));
      setIsLoading(false);
      return;
    }

    clearTicketFromUrl();
    void exchangeTicket(ticket);
  }, [callbackError, provider, ticket]);

  async function exchangeTicket(value: string) {
    try {
      const result = await authService.exchangeOAuthTicket(value);
      await handleExchangeResult(result);
    } catch (exchangeError) {
      setError(getAuthErrorMessage(exchangeError));
      setIsLoading(false);
    }
  }

  async function handleExchangeResult(result: OAuthExchangeResponse) {
    if (result.kind === "session") {
      finishSession(result);
      return;
    }

    setProfile(result);
    setIsLoading(false);
  }

  function finishSession(result: OAuthSessionResponse) {
    try {
      setAuthSession(result.session);
      navigate(
        getSafeRedirectPath(
          result.redirectTo,
          getDefaultRouteForRoles(result.session.user.roles),
        ),
        { replace: true },
      );
    } catch (sessionError) {
      setError(getAuthErrorMessage(sessionError));
      setIsLoading(false);
    }
  }

  const title = popupHandoff
    ? "Đã hoàn tất xác thực"
    : profile
      ? "Hoàn tất hồ sơ EduAI"
      : "Đang xác thực";
  const description = popupHandoff
    ? "Bạn có thể quay lại cửa sổ EduAI đang mở."
    : profile
      ? "Chỉ còn một bước để tạo tài khoản và bắt đầu học cùng EduAI."
      : `Đang hoàn tất đăng nhập${provider ? ` với ${providerLabel(provider)}` : ""}...`;

  return (
    <AuthPageShell description={description} mode="login" title={title}>
      {popupHandoff ? (
        <section
          aria-live="polite"
          className="auth-oauth-state-card"
          role="status"
        >
          <LoaderCircle
            aria-hidden="true"
            className="auth-oauth-state-card__spinner"
          />
          <p>Cửa sổ xác thực đang được đóng...</p>
        </section>
      ) : isLoading ? (
        <section
          aria-live="polite"
          className="auth-oauth-state-card"
          role="status"
        >
          <LoaderCircle
            aria-hidden="true"
            className="auth-oauth-state-card__spinner"
          />
          <p>Đang bảo mật phiên đăng nhập của bạn...</p>
        </section>
      ) : profile ? (
        <OAuthProfileCompletionForm
          onComplete={async (input) => {
            const result = await authService.completeOAuthProfile({
              ...input,
              ticket: profile.ticket,
            });
            finishSession(result);
          }}
          profile={profile}
        />
      ) : (
        <section
          aria-live="polite"
          className="auth-oauth-state-card auth-oauth-state-card--error"
          role="alert"
        >
          <AlertCircle
            aria-hidden="true"
            className="auth-oauth-state-card__error-icon"
          />
          <p>{error}</p>
          <Link className="auth-oauth-state-card__link" to="/login">
            Quay lại đăng nhập
          </Link>
        </section>
      )}
    </AuthPageShell>
  );
}

function clearTicketFromUrl(): void {
  if (typeof window === "undefined") return;

  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.hash}`,
  );
}

function getProvider(value: string | null): SocialOAuthProvider | null {
  return value === "facebook" || value === "zalo" ? value : null;
}

function providerLabel(provider: SocialOAuthProvider): string {
  return provider === "facebook" ? "Facebook" : "Zalo";
}

function getSafeRedirectPath(value: string | undefined, fallback: string): string {
  if (!value || !/^\/(?!\/)[A-Za-z0-9/_:-]*$/.test(value)) {
    return fallback;
  }

  return value;
}
