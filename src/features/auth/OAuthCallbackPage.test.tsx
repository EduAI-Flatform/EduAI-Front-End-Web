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
        kind: "profile_required",
        provider: "zalo",
        ticket: "profile-ticket-value",
        redirectTo: "/dashboard",
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
        ticket: "profile-ticket-value",
      }),
    );
    await waitFor(() => expect(getAuthSession()).toEqual(session));
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
});
