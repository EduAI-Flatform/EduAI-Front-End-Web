import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SocialOAuthButtons } from "./SocialOAuthButtons";

describe("SocialOAuthButtons", () => {
  it("renders only providers reported as available by the backend", () => {
    render(
      <SocialOAuthButtons
        capabilities={{ google: true, facebook: true, zalo: false }}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Tiếp tục với Facebook" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Tiếp tục với Zalo" }),
    ).not.toBeInTheDocument();
  });

  it("renders an accessible keyboard-operable Zalo control", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SocialOAuthButtons
        capabilities={{ google: true, facebook: false, zalo: true }}
        onSelect={onSelect}
      />,
    );

    const button = screen.getByRole("button", { name: "Tiếp tục với Zalo" });
    button.focus();
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith("zalo");
  });

  it("disables the other provider while one provider is loading", () => {
    render(
      <SocialOAuthButtons
        capabilities={{ google: true, facebook: true, zalo: true }}
        loadingProvider="facebook"
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Đang kết nối với Facebook" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByRole("button", { name: /Đang kết nối/ }),
    ).toBeDisabled();
  });

  it("renders no provider controls when both providers are disabled", () => {
    const { container } = render(
      <SocialOAuthButtons
        capabilities={{ google: true, facebook: false, zalo: false }}
        onSelect={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
