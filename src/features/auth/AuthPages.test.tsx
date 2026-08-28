import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import {
  GoogleExternalBrowserRequiredError,
  GoogleRoleSelectionRequiredError,
} from "../../services/auth.service";

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  registerWithGoogle: vi.fn(),
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
      login: authMocks.login,
      loginWithGoogle: authMocks.loginWithGoogle,
      registerWithGoogle: authMocks.registerWithGoogle,
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
    authMocks.registerWithGoogle.mockReset();
    authMocks.loginWithGoogle.mockReturnValue(new Promise(() => undefined));
    authMocks.registerWithGoogle.mockReturnValue(new Promise(() => undefined));
  });

  it("shows one safe embedded-browser recovery action", async () => {
    const user = userEvent.setup();
    authMocks.loginWithGoogle.mockRejectedValueOnce(
      new GoogleExternalBrowserRequiredError(),
    );

    window.history.pushState(
      {},
      "",
      "/login?code=stale&state=missing&error=bad#access_token=redacted",
    );

    try {
      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>,
      );

      await user.click(
        screen.getByRole("button", { name: "Tiếp tục với Google" }),
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: "Đăng nhập Google cần trình duyệt ngoài",
        }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Nếu không tự mở/)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Tiếp tục với Google" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Thử lại" }),
      ).not.toBeInTheDocument();

      const externalLink = screen.getByRole("link", {
        name: "Mở bằng Safari/Chrome",
      });
      expect(externalLink).toHaveAttribute("target", "_blank");
      const href = new URL(externalLink.getAttribute("href") ?? "");
      expect(href.pathname).toBe("/login");
      expect(href.search).toBe("");
      expect(href.hash).toBe("");
      expect(href.toString()).not.toMatch(/code|state|error|access_token/);
    } finally {
      window.history.replaceState({}, "", "/");
    }
  });

  it("starts in embedded recovery mode before a Google action", () => {
    const userAgentSpy = vi
      .spyOn(navigator, "userAgent", "get")
      .mockReturnValue(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Zalo/1.0",
      );

    try {
      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>,
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Tiếp tục với Google" }),
      ).not.toBeInTheDocument();
      expect(authMocks.loginWithGoogle).not.toHaveBeenCalled();
    } finally {
      userAgentSpy.mockRestore();
    }
  });
  it("does not auto-process stale callback parameters after a refresh", () => {
    render(
      <MemoryRouter initialEntries={["/login?code=stale&state=missing"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", { name: "Tiếp tục với Google" }),
    ).toBeInTheDocument();
    expect(authMocks.loginWithGoogle).not.toHaveBeenCalled();
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

    expect(authMocks.registerWithGoogle).toHaveBeenCalledWith("student");
    expect(
      screen.getByRole("button", { name: "Đang kết nối với Google..." }),
    ).toBeDisabled();
  });

  it("asks a new Google user to choose a role before retrying", async () => {
    const user = userEvent.setup();
    const retry = vi.fn().mockReturnValue(new Promise(() => undefined));
    const cleanup = vi.fn().mockResolvedValue(undefined);
    authMocks.loginWithGoogle.mockRejectedValueOnce(
      new GoogleRoleSelectionRequiredError(retry, cleanup),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "Tiếp tục với Google" }),
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Giảng viên/ }));
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(retry).toHaveBeenCalledWith("instructor");
  });

  it("keeps email/password registration available after Google recovery", async () => {
    const user = userEvent.setup();
    authMocks.registerWithGoogle.mockRejectedValueOnce(
      new GoogleExternalBrowserRequiredError(),
    );

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "Tiếp tục với Google" }),
    );

    expect(
      screen.queryByRole("button", { name: "Tiếp tục với Google" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Địa chỉ email")).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Tạo tài khoản" }),
    ).toBeEnabled();
  });
});

describe("Backend email auth actions on auth pages", () => {
  beforeEach(() => {
    authMocks.login.mockReset();
    authMocks.registerWithEmail.mockReset();
    authMocks.login.mockResolvedValue({
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

  it("always submits normal email login through the backend auth service", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Email"), "student@example.com");
    await user.type(screen.getByLabelText(/Mật khẩu/), "Str0ngPassword!123");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(authMocks.login).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "Str0ngPassword!123",
    });
    expect(
      screen.queryByRole("link", { name: "Quên mật khẩu?" }),
    ).not.toBeInTheDocument();
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
