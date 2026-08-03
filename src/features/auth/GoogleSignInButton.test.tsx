import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GoogleSignInButton } from "./GoogleSignInButton";

describe("GoogleSignInButton", () => {
  it("shows the Google action and forwards clicks", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<GoogleSignInButton onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Tiếp tục với Google" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disables the action and announces loading", () => {
    render(<GoogleSignInButton isLoading onClick={vi.fn()} />);

    const button = screen.getByRole("button", {
      name: "Đang kết nối với Google...",
    });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
