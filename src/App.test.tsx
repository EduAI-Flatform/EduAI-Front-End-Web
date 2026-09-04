import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const auth = vi.hoisted(() => ({
  useAuthSession: vi.fn(
    (): { accessToken: string } | null => ({ accessToken: "access-token" }),
  ),
}));

vi.mock("./features/auth/auth-store", () => ({
  useAuthSession: auth.useAuthSession,
}));

vi.mock("./components/layout/header", () => ({
  default: () => <header data-testid="app-header" />,
}));

vi.mock("./features/notifications/NotificationCenter", () => ({
  NotificationCenter: () => <div data-testid="notification-center" />,
}));

vi.mock("./features/dashboard/StudentDashboard", () => ({
  StudentDashboard: () => <div data-testid="student-dashboard-route" />,
}));

describe("App notification visibility", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
    auth.useAuthSession.mockReturnValue({ accessToken: "access-token" });
  });

  it("does not mount notification center on the student dashboard", async () => {
    window.history.replaceState({}, "", "/dashboard");

    render(<App />);

    expect(await screen.findByTestId("student-dashboard-route")).toBeVisible();
    expect(screen.queryByTestId("notification-center")).not.toBeInTheDocument();
  });

  it.each([
    ["/terms", "Điều khoản sử dụng"],
    ["/privacy", "Chính sách bảo mật"],
    ["/data-deletion", "Yêu cầu xóa dữ liệu"],
  ])("renders the public legal page at %s while logged out", async (path, heading) => {
    auth.useAuthSession.mockReturnValue(null);
    window.history.replaceState({}, "", path);

    render(<App />);

    expect(await screen.findByRole("heading", { name: heading, level: 1 })).toBeVisible();
    expect(screen.getByRole("main")).not.toHaveTextContent("Đang tải nội dung");
  });
});
