import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Footer from "./footer";

describe("Footer mobile accordion", () => {
  it("keeps every group closed until its button is activated", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    const mobileFooter = screen.getByRole("region", { name: "Footer di động" });
    const productButton = within(mobileFooter).getByRole("button", {
      name: "Sản phẩm",
    });

    expect(productButton).toHaveAttribute("aria-expanded", "false");
    expect(
      within(mobileFooter).queryByRole("link", { name: "Khóa học" }),
    ).not.toBeInTheDocument();
    expect(
      within(mobileFooter).getByRole("button", { name: "Công ty" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      within(mobileFooter).getByRole("button", { name: "Pháp lý" }),
    ).toHaveAttribute("aria-expanded", "false");

    await user.click(productButton);

    expect(productButton).toHaveAttribute("aria-expanded", "true");
    expect(
      within(mobileFooter).getByRole("link", { name: "Khóa học" }),
    ).toHaveAttribute("href", "/courses");

    await user.click(productButton);

    expect(productButton).toHaveAttribute("aria-expanded", "false");
    expect(
      within(mobileFooter).queryByRole("link", { name: "Khóa học" }),
    ).not.toBeInTheDocument();
  });
});
