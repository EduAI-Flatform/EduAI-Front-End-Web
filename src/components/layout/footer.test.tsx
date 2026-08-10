import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Footer from "./footer";

describe("Footer navigation", () => {
  it("exposes only destinations implemented by the application router", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Khóa học" })).toHaveAttribute(
      "href",
      "/courses",
    );
    expect(screen.getByRole("link", { name: "Cộng đồng" })).toHaveAttribute("href", "/community");
    expect(screen.getByRole("link", { name: "Tính năng AI" })).toHaveAttribute("href", "/ai");

    for (const path of [
      "/pricing",
      "/about",
      "/contact",
      "/terms",
      "/privacy",
      "/language",
      "/global",
    ]) {
      expect(document.querySelector(`a[href="${path}"]`)).not.toBeInTheDocument();
    }
  });
});
