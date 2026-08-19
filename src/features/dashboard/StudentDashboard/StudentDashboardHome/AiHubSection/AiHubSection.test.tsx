import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AiHubSection } from "./AiHubSection";

describe("AiHubSection", () => {
  it("makes each AI shortcut navigable", () => {
    render(
      <MemoryRouter>
        <AiHubSection />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Gia sư AI/i })).toHaveAttribute(
      "href",
      "/dashboard/ai",
    );
    expect(screen.getByRole("link", { name: /Tóm tắt AI/i })).toHaveAttribute(
      "href",
      "/dashboard/ai/tools",
    );
    expect(screen.getByRole("link", { name: /AI Quiz/i })).toHaveAttribute(
      "href",
      "/dashboard/ai/tools",
    );
    expect(screen.getByRole("link", { name: /Flashcards/i })).toHaveAttribute(
      "href",
      "/dashboard/ai/tools",
    );
  });
});
