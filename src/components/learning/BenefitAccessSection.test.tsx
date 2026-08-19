import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BenefitAccessSection } from "./BenefitAccessSection";

describe("BenefitAccessSection", () => {
  it("exposes compact destinations for scholarships, vouchers, and TMI", () => {
    render(
      <MemoryRouter>
        <BenefitAccessSection />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Học bổng/i })).toHaveAttribute(
      "href",
      "/courses",
    );
    expect(screen.getByRole("link", { name: /Voucher/i })).toHaveAttribute(
      "href",
      "/courses",
    );
    expect(screen.getByRole("link", { name: /Điểm TMI/i })).toHaveAttribute(
      "href",
      "/dashboard/tmi",
    );
  });
});
