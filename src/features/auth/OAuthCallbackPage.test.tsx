import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import {
  authService,
  type AuthSession,
} from "../../services/auth.service";
import { getAuthSession } from "../../services/auth.service";
import { OAuthCallbackPage } from "./OAuthCallbackPage";

const session: AuthSession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  tokenType: "Bearer",
  expiresIn: 900,
  user: {
    id: "user-id",
    email: "learner@example.com",
    fullName: "Learner",
    roles: ["student"],
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

describe("OAuthCallbackPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: null,
    });
  });

  it("exchanges a session ticket and persists the normal EduAI session", async () => {
    vi.spyOn(authService, "exchangeOAuthTicket").mockResolvedValue({
      kind: "session",
      redirectTo: "/",
      session,
    });

    render(
      <MemoryRouter initialEntries={["/auth/callback?ticket=ticket-value"]}>
        <OAuthCallbackPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getAuthSession()).toEqual(session));
  });

  it("asks for email when the provider profile is incomplete", async () => {
    const exchange = vi
      .spyOn(authService, "exchangeOAuthTicket")
      .mockResolvedValue({
        kind: "onboarding",
        provider: "zalo",
        ticket: "profile-ticket-value",
        redirectTo: "/dashboard",
        requiresEmail: true,
        role: "student",
        displayName: "Zalo Learner",
      });
    const complete = vi
      .spyOn(authService, "completeOAuthProfile")
      .mockResolvedValue({
        kind: "session",
        redirectTo: "/dashboard",
        session,
      });

    render(
      <MemoryRouter initialEntries={["/auth/callback?ticket=ticket-value"]}>
        <OAuthCallbackPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Thêm email để tiếp tục" })).toBeInTheDocument();
    expect(exchange).toHaveBeenCalledWith("ticket-value");

    const emailInput = screen.getByLabelText("Email");
    await import("@testing-library/user-event").then(async ({ default: userEvent }) => {
      const user = userEvent.setup();
      await user.type(emailInput, "zalo@example.com");
      await user.click(screen.getByRole("button", { name: "Hoàn tất đăng ký" }));
    });

    await waitFor(() =>
      expect(complete).toHaveBeenCalledWith({
        email: "zalo@example.com",
        fullName: "Zalo Learner",
        role: "student",
        ticket: "profile-ticket-value",
      }),
    );
    await waitFor(() => expect(getAuthSession()).toEqual(session));
  });

  it("keeps the normal redirect-compatible exchange when no opener exists", async () => {
    const exchange = vi.spyOn(authService, "exchangeOAuthTicket").mockResolvedValue({
      kind: "session",
      redirectTo: "/",
      session,
    });

    Object.defineProperty(window, "opener", {
      configurable: true,
      value: null,
    });

    render(
      <MemoryRouter
        initialEntries={[`/auth/callback?provider=facebook&ticket=${"o".repeat(43)}`]}
      >
        <OAuthCallbackPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(exchange).toHaveBeenCalledWith("o".repeat(43)));
    await waitFor(() => expect(getAuthSession()).toEqual(session));
  });

  it("asks for a role before completing a first-time redirect login", async () => {
    const exchange = vi.spyOn(authService, "exchangeOAuthTicket").mockResolvedValue({
      kind: "onboarding",
      provider: "facebook",
      ticket: "onboarding-ticket-value",
      redirectTo: "/",
      requiresEmail: false,
    });
    const complete = vi
      .spyOn(authService, "completeOAuthProfile")
      .mockResolvedValue({
        kind: "session",
        redirectTo: "/",
        session,
      });

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/auth/callback?provider=facebook&ticket=ticket-value"]}>
        <OAuthCallbackPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(exchange).toHaveBeenCalledWith("ticket-value"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Gi/ }));
    await user.click(screen.getByRole("button", { name: /Ti/ }));

    await waitFor(() =>
      expect(complete).toHaveBeenCalledWith({
        role: "instructor",
        ticket: "onboarding-ticket-value",
      }),
    );
  });

  it("renders a safe Vietnamese error without calling the exchange API", async () => {
    const exchange = vi.spyOn(authService, "exchangeOAuthTicket");

    render(
      <MemoryRouter
        initialEntries={["/auth/callback?provider=facebook&error=OAUTH_PROVIDER_REQUEST_FAILED"]}
      >
        <OAuthCallbackPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("alert", {
        name: "",
      }),
    ).toHaveTextContent("Không thể hoàn tất đăng nhập. Vui lòng thử lại.");
    expect(exchange).not.toHaveBeenCalled();
  });

  it("hands a successful popup ticket to the exact-origin opener and closes", async () => {
    const exchange = vi.spyOn(authService, "exchangeOAuthTicket");
    const postMessage = vi.fn();
    const close = vi.spyOn(window, "close").mockImplementation(() => undefined);
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: { postMessage },
    });

    render(
      <MemoryRouter
        initialEntries={[`/auth/callback?provider=facebook&ticket=${"o".repeat(43)}`]}
      >
        <OAuthCallbackPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(postMessage).toHaveBeenCalledOnce());
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "eduai.oauth.complete",
        provider: "facebook",
        ticket: "o".repeat(43),
      },
      window.location.origin,
    );
    expect(close).toHaveBeenCalledOnce();
    expect(exchange).not.toHaveBeenCalled();
  });

  it("does not post an unsafe callback ticket to the opener", async () => {
    const postMessage = vi.fn();
    const close = vi.spyOn(window, "close").mockImplementation(() => undefined);
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: { postMessage },
    });

    render(
      <MemoryRouter
        initialEntries={["/auth/callback?provider=facebook&ticket=provider-code"]}
      >
        <OAuthCallbackPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(postMessage).toHaveBeenCalledOnce());
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "eduai.oauth.error",
        provider: "facebook",
        error: "OAUTH_CALLBACK_FAILED",
      },
      window.location.origin,
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("hands a sanitized popup error to the opener without exposing provider details", async () => {
    const postMessage = vi.fn();
    const close = vi.spyOn(window, "close").mockImplementation(() => undefined);
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: { postMessage },
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/auth/callback?provider=zalo&error=provider-secret-detail",
        ]}
      >
        <OAuthCallbackPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(postMessage).toHaveBeenCalledOnce());
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "eduai.oauth.error",
        provider: "zalo",
        error: "OAUTH_CALLBACK_FAILED",
      },
      window.location.origin,
    );
    expect(close).toHaveBeenCalledOnce();
  });
});
