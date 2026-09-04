import { isStandaloneDisplay } from "../features/pwa/pwa-utils";
import type {
  OAuthExchangeResponse,
  SocialOAuthProvider,
  SocialOAuthStartInput,
} from "./auth.service";

export const OAUTH_POPUP_COMPLETE_MESSAGE = "eduai.oauth.complete" as const;
export const OAUTH_POPUP_ERROR_MESSAGE = "eduai.oauth.error" as const;

const OAUTH_POPUP_WIDTH = 540;
const OAUTH_POPUP_HEIGHT = 700;
const OAUTH_POPUP_POLL_MS = 400;
const OAUTH_TICKET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const SAFE_POPUP_ERROR_CODES = new Set([
  "ACCOUNT_ALREADY_EXISTS",
  "ACCOUNT_LINK_CONFLICT",
  "ACCOUNT_ROLE_REQUIRED",
  "OAUTH_CALLBACK_FAILED",
  "OAUTH_MODE_INVALID",
  "OAUTH_PROVIDER_CANCELLED",
  "OAUTH_PROVIDER_MISMATCH",
  "OAUTH_PROVIDER_REQUEST_FAILED",
  "OAUTH_PROVIDER_RESPONSE_INVALID",
  "OAUTH_PROVIDER_UNAVAILABLE",
  "OAUTH_PROVIDER_UNSUPPORTED",
  "OAUTH_REDIRECT_NOT_ALLOWED",
  "OAUTH_ROLE_NOT_ALLOWED",
  "OAUTH_STATE_INVALID",
  "OAUTH_STATE_STORE_UNAVAILABLE",
  "OAUTH_TICKET_INVALID",
  "SOCIAL_ACCOUNT_LINK_REQUIRED",
]);

export type OAuthPopupErrorCode =
  | "ACCOUNT_ALREADY_EXISTS"
  | "ACCOUNT_LINK_CONFLICT"
  | "ACCOUNT_ROLE_REQUIRED"
  | "OAUTH_CALLBACK_FAILED"
  | "OAUTH_MODE_INVALID"
  | "OAUTH_PROVIDER_CANCELLED"
  | "OAUTH_PROVIDER_MISMATCH"
  | "OAUTH_PROVIDER_REQUEST_FAILED"
  | "OAUTH_PROVIDER_RESPONSE_INVALID"
  | "OAUTH_PROVIDER_UNAVAILABLE"
  | "OAUTH_PROVIDER_UNSUPPORTED"
  | "OAUTH_REDIRECT_NOT_ALLOWED"
  | "OAUTH_ROLE_NOT_ALLOWED"
  | "OAUTH_STATE_INVALID"
  | "OAUTH_STATE_STORE_UNAVAILABLE"
  | "OAUTH_TICKET_INVALID"
  | "SOCIAL_ACCOUNT_LINK_REQUIRED";

export interface OAuthPopupCompleteMessage {
  type: typeof OAUTH_POPUP_COMPLETE_MESSAGE;
  provider: SocialOAuthProvider;
  ticket: string;
}

export interface OAuthPopupErrorMessage {
  type: typeof OAUTH_POPUP_ERROR_MESSAGE;
  provider: SocialOAuthProvider;
  error: OAuthPopupErrorCode;
}

export type OAuthPopupMessage =
  | OAuthPopupCompleteMessage
  | OAuthPopupErrorMessage;

export type SocialOAuthPopupLaunch =
  | { kind: "redirect" }
  | { completion: Promise<OAuthExchangeResponse>; kind: "popup" };

export class SocialOAuthPopupError extends Error {
  constructor(readonly code: OAuthPopupErrorCode) {
    super(code);
    this.name = "SocialOAuthPopupError";
  }
}

interface LaunchOptions {
  buildStartUrl: (
    provider: SocialOAuthProvider,
    input: SocialOAuthStartInput,
  ) => string;
  exchangeTicket: (ticket: string) => Promise<OAuthExchangeResponse>;
  windowLike?: Window;
}

export function launchSocialOAuthPopup(
  provider: SocialOAuthProvider,
  input: SocialOAuthStartInput,
  options: LaunchOptions,
): SocialOAuthPopupLaunch {
  const windowLike =
    options.windowLike ??
    (typeof window === "undefined" ? undefined : window);
  const startUrl = options.buildStartUrl(provider, input);

  if (
    !windowLike ||
    shouldUseSocialOAuthRedirectFallback(
      windowLike,
      typeof navigator === "undefined" ? undefined : navigator,
    )
  ) {
    windowLike?.location.assign(startUrl);
    return { kind: "redirect" };
  }

  let popup: Window | null = null;
  try {
    popup = windowLike.open(
      startUrl,
      `eduai-${provider}-oauth`,
      getCenteredOAuthPopupFeatures(windowLike),
    );
  } catch {
    popup = null;
  }

  if (!popup) {
    windowLike.location.assign(startUrl);
    return { kind: "redirect" };
  }

  popup.focus?.();
  return {
    kind: "popup",
    completion: waitForOAuthPopupCompletion(
      popup,
      provider,
      options.exchangeTicket,
      windowLike,
    ),
  };
}

export function getCenteredOAuthPopupFeatures(windowLike: Window): string {
  const screenLeft = windowLike.screenLeft ?? windowLike.screenX ?? 0;
  const screenTop = windowLike.screenTop ?? windowLike.screenY ?? 0;
  const viewportWidth = windowLike.outerWidth ?? windowLike.innerWidth;
  const viewportHeight = windowLike.outerHeight ?? windowLike.innerHeight;
  const left = Math.max(
    0,
    Math.round(screenLeft + (viewportWidth - OAUTH_POPUP_WIDTH) / 2),
  );
  const top = Math.max(
    0,
    Math.round(screenTop + (viewportHeight - OAUTH_POPUP_HEIGHT) / 2),
  );

  return [
    "popup=yes",
    `width=${OAUTH_POPUP_WIDTH}`,
    `height=${OAUTH_POPUP_HEIGHT}`,
    `left=${left}`,
    `top=${top}`,
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");
}

export function shouldUseSocialOAuthRedirectFallback(
  windowLike: Window,
  navigatorLike: Navigator | undefined,
): boolean {
  const userAgent = navigatorLike?.userAgent ?? "";
  return (
    isEmbeddedBrowserUserAgent(userAgent) ||
    isMobileBrowser(userAgent, navigatorLike) ||
    isStandaloneDisplay(
      windowLike,
      navigatorLike as unknown as { standalone?: boolean },
    )
  );
}

export function isMobileBrowser(
  userAgent: string,
  navigatorLike?: Pick<Navigator, "platform" | "maxTouchPoints">,
): boolean {
  return (
    /Android|iPhone|iPad|iPod/i.test(userAgent) ||
    (navigatorLike?.platform === "MacIntel" &&
      (navigatorLike.maxTouchPoints ?? 0) > 1)
  );
}

export function isEmbeddedBrowserUserAgent(userAgent: string): boolean {
  return (
    /FBAN|FBAV|FBIOS|FB_IAB|FB4A|Messenger|Instagram|Zalo|Line\//i.test(
      userAgent,
    ) ||
    (/Android/i.test(userAgent) && /\bwv\)/i.test(userAgent))
  );
}

export function isOAuthPopupWindow(windowLike: Window = window): boolean {
  return Boolean(windowLike.opener && windowLike.opener !== windowLike);
}

export function getSafeOAuthPopupErrorCode(
  value: string | null | undefined,
): OAuthPopupErrorCode {
  return value && SAFE_POPUP_ERROR_CODES.has(value)
    ? (value as OAuthPopupErrorCode)
    : "OAUTH_CALLBACK_FAILED";
}

export function isSafeOAuthPopupTicket(
  value: unknown,
): value is string {
  return typeof value === "string" && OAUTH_TICKET_PATTERN.test(value);
}

export function postOAuthPopupMessage(
  message: OAuthPopupMessage,
  windowLike: Window = window,
): boolean {
  const opener = windowLike.opener;
  if (!opener || opener === windowLike) {
    return false;
  }

  try {
    opener.postMessage(message, windowLike.location.origin);
    return true;
  } catch {
    return false;
  }
}

export function readOAuthPopupMessage(
  event: MessageEvent,
  popup: Window,
  expectedOrigin: string,
): OAuthPopupMessage | null {
  if (event.origin !== expectedOrigin || event.source !== popup) {
    return null;
  }

  const data = event.data;
  if (!isRecord(data) || !isSocialOAuthProvider(data.provider)) {
    return null;
  }

  if (
    data.type === OAUTH_POPUP_COMPLETE_MESSAGE &&
    isSafeOAuthPopupTicket(data.ticket)
  ) {
    return {
      type: OAUTH_POPUP_COMPLETE_MESSAGE,
      provider: data.provider,
      ticket: data.ticket,
    };
  }

  if (
    data.type === OAUTH_POPUP_ERROR_MESSAGE &&
    typeof data.error === "string" &&
    SAFE_POPUP_ERROR_CODES.has(data.error)
  ) {
    return {
      type: OAUTH_POPUP_ERROR_MESSAGE,
      provider: data.provider,
      error: data.error as OAuthPopupErrorCode,
    };
  }

  return null;
}

function waitForOAuthPopupCompletion(
  popup: Window,
  provider: SocialOAuthProvider,
  exchangeTicket: (ticket: string) => Promise<OAuthExchangeResponse>,
  windowLike: Window,
): Promise<OAuthExchangeResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const expectedOrigin = windowLike.location.origin;
    let pollHandle: number | undefined;

    const cleanup = () => {
      windowLike.removeEventListener("message", onMessage);
      if (pollHandle !== undefined) {
        windowLike.clearInterval(pollHandle);
      }
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onMessage = (event: MessageEvent) => {
      const message = readOAuthPopupMessage(event, popup, expectedOrigin);
      if (!message) return;
      if (message.provider !== provider) {
        fail(new SocialOAuthPopupError("OAUTH_CALLBACK_FAILED"));
        return;
      }

      settled = true;
      cleanup();
      if (message.type === OAUTH_POPUP_ERROR_MESSAGE) {
        reject(new SocialOAuthPopupError(message.error));
        return;
      }

      void exchangeTicket(message.ticket).then(resolve, reject);
    };

    windowLike.addEventListener("message", onMessage);
    pollHandle = windowLike.setInterval(() => {
      if (popup.closed) {
        fail(new SocialOAuthPopupError("OAUTH_PROVIDER_CANCELLED"));
      }
    }, OAUTH_POPUP_POLL_MS);
  });
}

function isSocialOAuthProvider(value: unknown): value is SocialOAuthProvider {
  return value === "facebook" || value === "zalo";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
