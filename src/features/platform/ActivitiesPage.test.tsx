import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ActivitiesPage } from "./ActivitiesPage";
describe("activities public page", () => {
  it("links to the existing community and shows a truthful empty event state", () => {
    render(
      <MemoryRouter>
        <ActivitiesPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Cộng đồng" })).toHaveAttribute(
      "href",
      "/community",
    );
    expect(
      screen.getByText("Chưa có hoạt động được công bố"),
    ).toBeInTheDocument();
    expect(screen.queryByText("2025")).not.toBeInTheDocument();
  });
});
