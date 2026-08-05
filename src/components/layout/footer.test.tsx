import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Footer from "./footer";

describe("Footer mobile layout", () => {
  it("shows all footer groups and the newsletter without accordion controls", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: "Sản phẩm" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Công ty" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pháp lý" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bản tin" })).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Khóa học" })).toHaveAttribute(
      "href",
      "/courses",
    );
    expect(screen.getByRole("link", { name: "Giới thiệu" })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(screen.getByRole("link", { name: "Bảo mật" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });
});
