import { describe, expect, it, vi } from "vitest";
import {
  getCenteredOAuthPopupFeatures,
  launchSocialOAuthPopup,
  readOAuthPopupMessage,
  shouldUseSocialOAuthRedirectFallback,
} from "./social-oauth-popup";

function createDesktopWindow(popup: Window | null) {
  const listeners: Array<(event: MessageEvent) => void> = [];
  const windowLike = {
    addEventListener: vi.fn((_type: string, listener: EventListener) => {
      listeners.push(listener as (event: MessageEvent) => void);
    }),
    clearInterval: vi.fn(),
    innerHeight: 900,
    innerWidth: 1440,
    location: { assign: vi.fn(), origin: "https://eduai.example" },
    open: vi.fn().mockReturnValue(popup),
    removeEventListener: vi.fn(),
    screenLeft: 100,
    screenTop: 50,
    setInterval: vi.fn().mockReturnValue(1),
  } as unknown as Window;

  return { listeners, windowLike };
}

describe("social OAuth popup transport", () => {
  it("opens a centered desktop popup and exchanges the ticket in the opener", async () => {
    const popup = { closed: false, focus: vi.fn() } as unknown as Window;
    const { listeners, windowLike } = createDesktopWindow(popup);
    const exchangeTicket = vi.fn().mockResolvedValue({
      kind: "session",
      redirectTo: "/",
    });

    const launch = launchSocialOAuthPopup(
      "facebook",
      { mode: "login" },
      {
        buildStartUrl: vi.fn(() => "https://api.eduai.example/oauth/start"),
        exchangeTicket,
        windowLike,
      },
    );

    expect(launch.kind).toBe("popup");
    expect(windowLike.open).toHaveBeenCalledWith(
      "https://api.eduai.example/oauth/start",
      "eduai-facebook-oauth",
      expect.stringContaining("width=540"),
    );
    expect(getCenteredOAuthPopupFeatures(windowLike)).toContain("left=550");

    listeners[0](
      new MessageEvent("message", {
        data: {
          type: "eduai.oauth.complete",
          provider: "facebook",
          ticket: "o".repeat(43),
        },
        origin: "https://eduai.example",
        source: popup,
      }),
    );

    await expect(
      launch.kind === "popup" ? launch.completion : Promise.reject(),
    ).resolves.toMatchObject({ kind: "session" });
    expect(exchangeTicket).toHaveBeenCalledOnce();
    expect(exchangeTicket).toHaveBeenCalledWith("o".repeat(43));
  });

  it("rejects a provider error without exchanging a ticket", async () => {
    const popup = { closed: false } as unknown as Window;
    const { listeners, windowLike } = createDesktopWindow(popup);
    const exchangeTicket = vi.fn();
    const launch = launchSocialOAuthPopup(
      "zalo",
      { mode: "login" },
      {
        buildStartUrl: vi.fn(() => "https://api.eduai.example/oauth/start"),
        exchangeTicket,
        windowLike,
      },
    );

    listeners[0](
      new MessageEvent("message", {
        data: {
          type: "eduai.oauth.error",
          provider: "zalo",
          error: "OAUTH_PROVIDER_REQUEST_FAILED",
        },
        origin: "https://eduai.example",
        source: popup,
      }),
    );

    await expect(
      launch.kind === "popup" ? launch.completion : Promise.reject(),
    ).rejects.toMatchObject({ code: "OAUTH_PROVIDER_REQUEST_FAILED" });
    expect(exchangeTicket).not.toHaveBeenCalled();
  });

  it("ignores forged messages from another origin or window", async () => {
    const popup = { closed: false } as unknown as Window;
    const { listeners, windowLike } = createDesktopWindow(popup);
    const exchangeTicket = vi.fn().mockResolvedValue({ kind: "session" });
    const launch = launchSocialOAuthPopup(
      "facebook",
      { mode: "login" },
      {
        buildStartUrl: vi.fn(() => "https://api.eduai.example/oauth/start"),
        exchangeTicket,
        windowLike,
      },
    );

    expect(
      readOAuthPopupMessage(
        {
          data: {
            type: "eduai.oauth.complete",
            provider: "facebook",
            ticket: "f".repeat(43),
          },
          origin: "https://evil.example",
          source: popup,
        } as MessageEvent,
        popup,
        "https://eduai.example",
      ),
    ).toBeNull();

    listeners[0](
      new MessageEvent("message", {
        data: {
          type: "eduai.oauth.complete",
          provider: "facebook",
          ticket: "v".repeat(43),
        },
        origin: "https://eduai.example",
        source: popup,
      }),
    );
    await expect(
      launch.kind === "popup" ? launch.completion : Promise.reject(),
    ).resolves.toMatchObject({ kind: "session" });
    expect(exchangeTicket).toHaveBeenCalledWith("v".repeat(43));
  });

  it("falls back to a full-page redirect when the popup is blocked", () => {
    const { windowLike } = createDesktopWindow(null);
    const launch = launchSocialOAuthPopup(
      "facebook",
      { mode: "register", role: "student" },
      {
        buildStartUrl: vi.fn(() => "https://api.eduai.example/oauth/start"),
        exchangeTicket: vi.fn(),
        windowLike,
      },
    );

    expect(launch).toEqual({ kind: "redirect" });
    expect(windowLike.location.assign).toHaveBeenCalledWith(
      "https://api.eduai.example/oauth/start",
    );
  });
});

describe("social OAuth redirect fallback detection", () => {
  it("uses redirect mode on mobile and standalone contexts", () => {
    expect(
      shouldUseSocialOAuthRedirectFallback(
        {
          matchMedia: () => ({ matches: false }) as MediaQueryList,
        } as unknown as Window,
        {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari",
          platform: "iPhone",
          maxTouchPoints: 5,
        } as Navigator,
      ),
    ).toBe(true);

    expect(
      shouldUseSocialOAuthRedirectFallback(
        {
          matchMedia: () => ({ matches: true }) as MediaQueryList,
        } as unknown as Window,
        { userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/120" } as Navigator,
      ),
    ).toBe(true);
  });
});
