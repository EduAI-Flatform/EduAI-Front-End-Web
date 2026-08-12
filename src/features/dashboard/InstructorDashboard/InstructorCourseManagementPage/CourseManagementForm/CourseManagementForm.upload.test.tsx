import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CourseManagementForm } from "./CourseManagementForm";

describe("CourseManagementForm thumbnail upload", () => {
  it("selects, previews, and submits a local image file", async () => {
    URL.createObjectURL = vi.fn(() => "blob:course-preview");
    URL.revokeObjectURL = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const file = new File(["image"], "course.webp", { type: "image/webp" });

    render(
      <CourseManagementForm
        error={null}
        isSaving={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Chọn ảnh khóa học"), {
      target: { files: [file] },
    });

    expect(screen.getByText("course.webp")).toBeInTheDocument();
    expect(screen.getByAltText("Xem trước ảnh khóa học")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Nhập tên khóa học"), {
      target: { value: "AI Foundations" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu khóa học" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ thumbnail: file, title: "AI Foundations" }),
      ),
    );
  });
});
