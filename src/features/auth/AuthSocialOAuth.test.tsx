import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authService } from "../../services/auth.service";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

describe("auth page social OAuth integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps Google and renders enabled Facebook/Zalo providers on Login", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "getOAuthProviders").mockResolvedValue({
      google: true,
      facebook: true,
      zalo: true,
    });
    const start = vi
      .spyOn(authService, "startSocialOAuth")
      .mockImplementation(() => undefined);

    render(
      <MemoryRouter initialEntries={["/login?redirectTo=/courses"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", { name: "Tiếp tục với Google" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Tiếp tục với Facebook" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tiếp tục với Zalo" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tiếp tục với Facebook" }));
    expect(start).toHaveBeenCalledWith("facebook", {
      mode: "login",
      redirectTo: "/courses",
    });
  });

  it("requires a role before launching Facebook registration", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "getOAuthProviders").mockResolvedValue({
      google: true,
      facebook: true,
      zalo: false,
    });
    const start = vi
      .spyOn(authService, "startSocialOAuth")
      .mockImplementation(() => undefined);

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    const facebookButton = await screen.findByRole("button", {
      name: "Tiếp tục với Facebook",
    });
    await user.click(facebookButton);

    expect(start).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Giảng viên/ }));
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(start).toHaveBeenCalledWith("facebook", {
      mode: "register",
      redirectTo: undefined,
      role: "instructor",
    });
  });

  it("pauses a first-time Facebook login until a role is selected", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "getOAuthProviders").mockResolvedValue({
      google: true,
      facebook: true,
      zalo: false,
    });
    const complete = vi
      .spyOn(authService, "completeOAuthProfile")
      .mockResolvedValue({
        kind: "session",
        redirectTo: "/",
        session: {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          tokenType: "Bearer",
          expiresIn: 900,
          user: {
            id: "user-id",
            email: "facebook@example.com",
            fullName: "Facebook User",
            roles: ["instructor"],
            status: "active",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        },
      });
    vi.spyOn(authService, "startSocialOAuth").mockReturnValue({
      kind: "popup",
      completion: Promise.resolve({
        kind: "onboarding",
        provider: "facebook",
        ticket: "t".repeat(43),
        redirectTo: "/",
        requiresEmail: false,
      }),
    } as never);

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", { name: /Facebook/ }),
    );
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(complete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Gi/ }));
    await user.click(screen.getByRole("button", { name: /Ti/ }));

    await waitFor(() =>
      expect(complete).toHaveBeenCalledWith({
        role: "instructor",
        ticket: "t".repeat(43),
      }),
    );
  });

  it("requires a role before launching Zalo registration", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "getOAuthProviders").mockResolvedValue({
      google: true,
      facebook: false,
      zalo: true,
    });
    const start = vi
      .spyOn(authService, "startSocialOAuth")
      .mockImplementation(() => undefined);

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", { name: "Tiếp tục với Zalo" }),
    );
    expect(start).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Học viên/ }));
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(start).toHaveBeenCalledWith("zalo", {
      mode: "register",
      redirectTo: undefined,
      role: "student",
    });
  });
});
