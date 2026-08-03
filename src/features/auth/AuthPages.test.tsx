import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  register: vi.fn(),
}));

vi.mock("../../services/auth.service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../services/auth.service")
  >();

  return {
    ...actual,
    authService: {
      ...actual.authService,
      loginWithGoogle: authMocks.loginWithGoogle,
    },
    getAuthErrorMessage: vi.fn(() => "Lỗi xác thực"),
    getDefaultRouteForRoles: vi.fn(() => "/dashboard"),
    getGoogleAuthErrorMessage: vi.fn(() => "Không thể đăng nhập bằng Google"),
  };
});

describe("Google auth actions on auth pages", () => {
  beforeEach(() => {
    authMocks.loginWithGoogle.mockReset();
    authMocks.loginWithGoogle.mockReturnValue(new Promise(() => undefined));
  });

  it("renders and locks the Google action on the login page", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", {
      name: "Tiếp tục với Google",
    });
    expect(screen.queryByText("LinkedIn")).not.toBeInTheDocument();
    await user.click(button);

    expect(authMocks.loginWithGoogle).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Đang kết nối với Google..." }),
    ).toBeDisabled();
  });

  it("renders and locks the Google action on the register page", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", {
      name: "Tiếp tục với Google",
    });
    expect(screen.queryByText("LinkedIn")).not.toBeInTheDocument();
    await user.click(button);

    expect(authMocks.loginWithGoogle).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Đang kết nối với Google..." }),
    ).toBeDisabled();
  });
});
