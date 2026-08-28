export type PwaPlatform = "ios" | "android" | "chromium-desktop" | "unsupported";

export const PWA_INSTALL_DISMISSED_KEY = "eduai.pwa.install-dismissed.v1";

interface StandaloneWindow {
  matchMedia?: (query: string) => MediaQueryList;
}

interface StandaloneNavigator {
  standalone?: boolean;
}
export function isStandaloneDisplay(
  windowLike: StandaloneWindow | undefined =
    typeof window === "undefined" ? undefined : window,
  navigatorLike: StandaloneNavigator | undefined =
    typeof navigator === "undefined" ? undefined : (navigator as Navigator & { standalone?: boolean }),
): boolean {
  const displayModeStandalone =
    windowLike?.matchMedia?.("(display-mode: standalone)").matches ?? false;

  return displayModeStandalone || navigatorLike?.standalone === true;
}

export function detectPwaPlatform(
  userAgent: string = typeof navigator === "undefined" ? "" : navigator.userAgent,
  platform: string = typeof navigator === "undefined" ? "" : navigator.platform,
  maxTouchPoints: number =
    typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints,
): PwaPlatform {
  const iosDevice =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);

  if (iosDevice) return "ios";
  if (/Android/i.test(userAgent)) {
    return /Chrome|Chromium|CriOS|EdgA|OPR/i.test(userAgent)
      ? "android"
      : "unsupported";
  }

  return /Chrome|Chromium|Edg|OPR/i.test(userAgent)
    ? "chromium-desktop"
    : "unsupported";
}

export function canOfferInstall(
  platform: PwaPlatform,
  standalone: boolean,
  hasDeferredPrompt: boolean,
): boolean {
  return !standalone && (hasDeferredPrompt || platform !== "unsupported");
}

export function readInstallPromptDismissed(
  storage: Pick<Storage, "getItem"> | undefined =
    typeof localStorage === "undefined" ? undefined : localStorage,
): boolean {
  try {
    return storage?.getItem(PWA_INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistInstallPromptDismissed(
  storage: Pick<Storage, "setItem"> | undefined =
    typeof localStorage === "undefined" ? undefined : localStorage,
): void {
  try {
    storage?.setItem(PWA_INSTALL_DISMISSED_KEY, "1");
  } catch {
    // Storage can be disabled in private or embedded browser contexts.
  }
}
