import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckEmailPage } from "./CheckEmailPage";

const authMocks = vi.hoisted(() => ({
  completeEmailRegistration: vi.fn(),
  resendVerificationEmail: vi.fn(),
}));

vi.mock("../../services/auth.service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../services/auth.service")
  >();

  return {
    ...actual,
    authService: {
      ...actual.authService,
      completeEmailRegistration: authMocks.completeEmailRegistration,
      resendVerificationEmail: authMocks.resendVerificationEmail,
    },
    getPendingEmailVerification: vi.fn(() => ({
      email: "student@example.com",
      fullName: "Student User",
      role: "student",
    })),
  };
});

describe("CheckEmailPage", () => {
  beforeEach(() => {
    authMocks.completeEmailRegistration.mockReset();
    authMocks.completeEmailRegistration.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      expiresIn: 900,
      user: {
        id: "user-id",
        email: "student@example.com",
        fullName: "Student User",
        roles: ["student"],
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    authMocks.resendVerificationEmail.mockReset();
    authMocks.resendVerificationEmail.mockResolvedValue(undefined);
  });

  it("resends verification and starts a 60-second cooldown", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CheckEmailPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/student@example.com/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gửi lại email xác minh" }));

    expect(authMocks.resendVerificationEmail).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Gửi lại email sau 60s" })).toBeDisabled();
  });

  it("completes backend registration after email verification", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CheckEmailPage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "Tôi đã xác minh email" }),
    );

    expect(authMocks.completeEmailRegistration).toHaveBeenCalledOnce();
  });
});
