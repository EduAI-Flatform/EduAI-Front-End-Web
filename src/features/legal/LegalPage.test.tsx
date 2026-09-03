import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DataDeletionPage, PrivacyPage } from "./LegalPage";

describe("Legal pages", () => {
  it("publishes the privacy policy and data-deletion route", () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Ch\u00ednh s\u00e1ch b\u1ea3o m\u1eadt" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Y\u00eau c\u1ea7u x\u00f3a d\u1eef li\u1ec7u" })).toHaveAttribute(
      "href",
      "/data-deletion",
    );
    expect(screen.getByRole("link", { name: /0834\.038\.128/ })).toHaveAttribute(
      "href",
      "tel:+84834038128",
    );
  });

  it("explains the manual Facebook data-deletion path", () => {
    render(
      <MemoryRouter>
        <DataDeletionPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Y\u00eau c\u1ea7u x\u00f3a d\u1eef li\u1ec7u" })).toBeInTheDocument();
    expect(screen.getByText(/Apps and Websites/i)).toBeInTheDocument();
    expect(screen.getByText(/kh\u00f4ng g\u1eedi m\u1eadt kh\u1ea9u/i)).toBeInTheDocument();
  });
});
