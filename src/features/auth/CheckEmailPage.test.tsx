import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckEmailPage } from "./CheckEmailPage";

const authMocks = vi.hoisted(() => ({
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
});
