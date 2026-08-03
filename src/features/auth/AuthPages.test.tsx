import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  loginWithEmail: vi.fn(),
  loginWithGoogle: vi.fn(),
  register: vi.fn(),
  registerWithEmail: vi.fn(),
}));

vi.mock("../../services/auth.service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../services/auth.service")
  >();

  return {
    ...actual,
    authService: {
      ...actual.authService,
      loginWithEmail: authMocks.loginWithEmail,
      loginWithGoogle: authMocks.loginWithGoogle,
      registerWithEmail: authMocks.registerWithEmail,
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

describe("Firebase email auth actions on auth pages", () => {
  beforeEach(() => {
    authMocks.loginWithEmail.mockReset();
    authMocks.registerWithEmail.mockReset();
    authMocks.loginWithEmail.mockResolvedValue({
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
    authMocks.registerWithEmail.mockResolvedValue({
      email: "student@example.com",
      fullName: "Student User",
      role: "student",
    });
  });

  it("uses Firebase email login instead of the legacy login endpoint", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Email"), "student@example.com");
    await user.type(screen.getByLabelText(/Mật khẩu/), "Str0ngPassword!123");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(authMocks.loginWithEmail).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "Str0ngPassword!123",
    });
    expect(authMocks.login).not.toHaveBeenCalled();
  });

  it("uses Firebase email registration and redirects to check-email", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Họ và tên"), "Student User");
    await user.type(screen.getByLabelText("Địa chỉ email"), "student@example.com");
    await user.type(screen.getByLabelText("Mật khẩu", { exact: true }), "Str0ngPassword!123");
    await user.type(screen.getByLabelText("Xác nhận"), "Str0ngPassword!123");
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(authMocks.registerWithEmail).toHaveBeenCalledWith({
      email: "student@example.com",
      fullName: "Student User",
      password: "Str0ngPassword!123",
      role: "student",
    });
    expect(screen.queryByText("Email này đã được sử dụng.")).not.toBeInTheDocument();
  });
});
