import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Header from "./header";

vi.mock("../../features/auth/auth-store", () => ({
  clearAuthSession: vi.fn(),
  useAuthSession: () => null,
}));

describe("Header mobile navigation contract", () => {
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
});
