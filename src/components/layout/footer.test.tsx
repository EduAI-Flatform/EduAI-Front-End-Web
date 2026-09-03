import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Footer from "./footer";

describe("Footer navigation", () => {
  it("renders the CNS developer credit with the logo before its text", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    const creditText =
      "Phát triển bởi Trung tâm an ninh công nghệ số - CNS";
    const credit = screen.getByRole("group", { name: "Đơn vị phát triển" });
    const logo = credit.querySelector("img");

    expect(credit).toHaveTextContent(creditText);
    expect(logo).not.toBeNull();
    expect(logo).toHaveAttribute("src", "/cns-logo.png");
    expect(logo).toHaveAttribute("alt", "");
    expect(logo).toHaveAttribute("width", "48");
    expect(logo).toHaveAttribute("height", "48");
    expect(credit.firstElementChild).toBe(logo);
  });

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
    expect(screen.getByRole("heading", { name: "Cộng đồng" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tham gia cộng đồng" })).toHaveAttribute(
      "href",
      "/community",
    );
    expect(screen.queryByRole("link", { name: "Cộng đồng" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tính năng AI" })).toHaveAttribute("href", "/ai");
    expect(screen.getByRole("link", { name: "Thư viện" })).toHaveAttribute("href", "/library");
    expect(screen.getByRole("link", { name: "Chứng chỉ" })).toHaveAttribute("href", "/verify");

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
