import { render, screen } from "@testing-library/react";
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

  it("passes the selected registration role to enabled Zalo OAuth", async () => {
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

    const zaloButton = await screen.findByRole("button", {
      name: "Tiếp tục với Zalo",
    });
    await user.click(zaloButton);

    expect(start).toHaveBeenCalledWith("zalo", {
      mode: "register",
      redirectTo: undefined,
      role: "student",
    });
  });
});
