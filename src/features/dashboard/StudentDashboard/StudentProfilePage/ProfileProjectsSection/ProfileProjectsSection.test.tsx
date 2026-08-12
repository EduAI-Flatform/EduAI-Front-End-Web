import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileProjectsSection } from "./ProfileProjectsSection";

describe("ProfileProjectsSection", () => {
  it("creates a project using a selected local image", async () => {
    URL.createObjectURL = vi.fn(() => "blob:project-preview");
    URL.revokeObjectURL = vi.fn();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <ProfileProjectsSection
        isLoading={false}
        onCreate={onCreate}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        projects={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Thêm dự án" }));
    fireEvent.change(screen.getByLabelText("Tên dự án"), {
      target: { value: "AI Assistant" },
    });
    const image = new File(["image"], "project.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Chọn ảnh dự án"), {
      target: { files: [image] },
    });
    expect(screen.getByAltText("Xem trước ảnh dự án")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lưu dự án" }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ image, title: "AI Assistant" }),
      ),
    );
  });
});
