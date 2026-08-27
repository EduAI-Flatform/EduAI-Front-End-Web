import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "../../services/auth.service";
import Header from "./header";

const auth = vi.hoisted(() => ({
  useAuthSession: vi.fn<() => AuthSession | null>(() => null),
}));

vi.mock("../../features/auth/auth-store", () => ({
  clearAuthSession: vi.fn(),
  useAuthSession: auth.useAuthSession,
}));

vi.mock("../../features/notifications/NotificationCenter", () => ({
  NotificationCenter: () => (
    <button data-testid="header-notification" type="button">
      Thông báo
    </button>
  ),
}));

describe("Header mobile navigation contract", () => {
  afterEach(() => {
    auth.useAuthSession.mockReturnValue(null);
  });

  it("uses five primary entries and reserves the safe-area nav height", () => {
    const headerStyles = readFileSync(
      resolve(process.cwd(), "src/components/layout/header.css"),
      "utf8",
    );
    const footerStyles = readFileSync(
      resolve(process.cwd(), "src/components/layout/footer.css"),
      "utf8",
    );

    expect(headerStyles).toMatch(
      /grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/,
    );
    expect(footerStyles).toContain(
      "padding-bottom: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom));",
    );
  });

  it("keeps five primary destinations visible and moves secondary routes into More", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/courses/course-123"]}>
        <Header />
      </MemoryRouter>,
    );

    const mobileNavigation = screen.getByRole("navigation", {
      name: /điều hướng chính/i,
    });
    const coursesLink = within(mobileNavigation).getByRole("link", {
      name: /khóa học/i,
    });

    expect(within(mobileNavigation).getAllByRole("link")).toHaveLength(5);
    expect(coursesLink).toHaveAttribute("aria-current", "page");

    await user.click(within(mobileNavigation).getByRole("button", { name: /thêm/i }));
    const moreMenu = screen.getByRole("dialog", { name: /thêm điều hướng/i });
    expect(within(moreMenu).getByRole("link", { name: /thư viện/i })).toHaveAttribute(
      "href",
      "/library",
    );
    expect(within(moreMenu).getByRole("link", { name: /chứng chỉ/i })).toHaveAttribute(
      "href",
      "/dashboard/certificates",
    );
  });

  it("keeps the AI entry active on nested AI tool routes", () => {
    render(
      <MemoryRouter initialEntries={["/ai/tools"]}>
        <Header />
      </MemoryRouter>,
    );

    const mobileNavigation = screen.getByRole("navigation", {
      name: /điều hướng chính/i,
    });

    expect(within(mobileNavigation).getByRole("link", { name: "AI" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("places notification between Cart and Profile in the authenticated header actions", () => {
    const session: AuthSession = {
      accessToken: "access-token",
      expiresIn: 3600,
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      user: {
        avatarUrl: null,
        createdAt: "2026-08-13T00:00:00.000Z",
        email: "student@example.test",
        fullName: "Student Example",
        id: "student-id",
        roles: ["student"],
        status: "active",
        updatedAt: "2026-08-13T00:00:00.000Z",
      },
    };
    auth.useAuthSession.mockReturnValue(session);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const actions = document.querySelector<HTMLElement>(".app-header__actions");
    expect(actions).not.toBeNull();

    const actionChildren = Array.from(actions!.children);
    const cart = within(actions!).getByRole("link", { name: /mở giỏ hàng/i });
    const notification = within(actions!).getByTestId("header-notification");
    const profile = within(actions!).getByRole("link", { name: /student example/i });

    expect(actionChildren.indexOf(cart)).toBeLessThan(actionChildren.indexOf(notification));
    expect(actionChildren.indexOf(notification)).toBeLessThan(actionChildren.indexOf(profile));
  });
});
