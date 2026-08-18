import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Header from "./header";

vi.mock("../../features/auth/auth-store", () => ({
  clearAuthSession: vi.fn(),
  useAuthSession: () => null,
}));

describe("Header mobile navigation contract", () => {
  it("uses three equal entries and reserves the safe-area nav height", () => {
    const headerStyles = readFileSync(
      resolve(process.cwd(), "src/components/layout/header.css"),
      "utf8",
    );
    const footerStyles = readFileSync(
      resolve(process.cwd(), "src/components/layout/footer.css"),
      "utf8",
    );

    expect(headerStyles).toMatch(
      /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
    );
    expect(footerStyles).toContain(
      "padding-bottom: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom));",
    );
  });

  it("keeps the courses entry active on nested course routes", () => {
    render(
      <MemoryRouter initialEntries={["/courses/course-123"]}>
        <Header />
      </MemoryRouter>,
    );

    const mobileNavigation = screen.getByRole("navigation", {
      name: "Điều hướng chính",
    });
    const coursesLink = within(mobileNavigation).getByRole("link", {
      name: "Khóa học",
    });

    expect(within(mobileNavigation).getAllByRole("link")).toHaveLength(3);
    expect(coursesLink).toHaveAttribute("aria-current", "page");
    expect(
      within(mobileNavigation).getByRole("link", { name: "Cộng đồng" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("keeps the AI entry active on nested AI tool routes", () => {
    render(
      <MemoryRouter initialEntries={["/ai/tools"]}>
        <Header />
      </MemoryRouter>,
    );

    const mobileNavigation = screen.getByRole("navigation", {
      name: "Điều hướng chính",
    });

    expect(
      within(mobileNavigation).getByRole("link", { name: "Tính năng" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
