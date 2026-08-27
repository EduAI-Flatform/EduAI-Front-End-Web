import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const auth = vi.hoisted(() => ({
  useAuthSession: vi.fn(() => ({ accessToken: "access-token" })),
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
});
