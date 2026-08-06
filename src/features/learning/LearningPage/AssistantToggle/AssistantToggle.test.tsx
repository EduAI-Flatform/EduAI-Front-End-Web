import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssistantToggle } from "./AssistantToggle";

describe("AssistantToggle", () => {
  it("exposes an AI icon to reopen the assistant when collapsed", () => {
    const onToggle = vi.fn();

    render(<AssistantToggle isOpen={false} onToggle={onToggle} />);

    const button = screen.getByRole("button", { name: "Mở trợ lý AI" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
