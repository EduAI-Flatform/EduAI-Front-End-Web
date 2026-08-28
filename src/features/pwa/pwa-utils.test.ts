import { afterEach, describe, expect, it } from "vitest";
import {
  canOfferInstall,
  detectPwaPlatform,
  isStandaloneDisplay,
  persistInstallPromptDismissed,
  PWA_INSTALL_DISMISSED_KEY,
  readInstallPromptDismissed,
} from "./pwa-utils";

describe("PWA browser utilities", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("detects iPhone and iPad Safari without relying on beforeinstallprompt", () => {
    expect(detectPwaPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "iPhone", 5)).toBe("ios");
    expect(detectPwaPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", "MacIntel", 5)).toBe("ios");
  });

  it("detects Android Chromium and desktop Chromium separately", () => {
    expect(detectPwaPlatform("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36")).toBe("android");
    expect(detectPwaPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36", "Win32")).toBe("chromium-desktop");
  });

  it("does not offer install UI in unsupported or standalone contexts", () => {
    expect(canOfferInstall("unsupported", false, false)).toBe(false);
    expect(canOfferInstall("chromium-desktop", true, true)).toBe(false);
    expect(canOfferInstall("chromium-desktop", false, true)).toBe(true);
  });

  it("supports both display-mode and iOS standalone detection", () => {
    expect(isStandaloneDisplay({ matchMedia: () => ({ matches: true } as MediaQueryList) }, undefined)).toBe(true);
    expect(isStandaloneDisplay({ matchMedia: () => ({ matches: false } as MediaQueryList) }, { standalone: true })).toBe(true);
  });

  it("persists dismissal without storing auth or payment data", () => {
    expect(readInstallPromptDismissed()).toBe(false);
    persistInstallPromptDismissed();
    expect(localStorage.getItem(PWA_INSTALL_DISMISSED_KEY)).toBe("1");
    expect(readInstallPromptDismissed()).toBe(true);
  });
});
