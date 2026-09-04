import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SocialRoleSelectionModal } from "./SocialRoleSelectionModal";

describe("SocialRoleSelectionModal", () => {
  it("requires an explicit student or instructor choice before continuing", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <SocialRoleSelectionModal
        isSubmitting={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        provider="facebook"
      />,
    );

    const continueButton = screen.getByRole("button", { name: "Tiếp tục" });
    expect(continueButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Giảng viên/ }));
    expect(continueButton).toBeEnabled();

    await user.click(continueButton);
    expect(onConfirm).toHaveBeenCalledWith("instructor");
  });

  it("closes through the accessible cancel action", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <SocialRoleSelectionModal
        isSubmitting={false}
        onCancel={onCancel}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        provider="zalo"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
