import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { courseService } from "../../../../../services/course.service";
import { LessonManagementForm } from "./LessonManagementForm";

describe("LessonManagementForm media uploads", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("uploads a selected video with progress before submitting its storage key", async () => {
    let finishUpload!: (value: { storageKey: string }) => void;
    vi.spyOn(courseService, "uploadLessonVideo").mockImplementation(
      (_courseId, _file, onProgress) => {
        onProgress(72, 100);
        return new Promise((resolve) => {
          finishUpload = resolve;
        });
      },
    );
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <LessonManagementForm
        courseId="course-id"
        error={null}
        isSaving={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const file = new File(["video"], "lesson.mp4", { type: "video/mp4" });
    fireEvent.change(screen.getByLabelText("Chọn video bài học"), {
      target: { files: [file] },
    });
    expect(await screen.findByText("Đang upload… 72%")).toBeInTheDocument();
    finishUpload({ storageKey: "lessons/course-id/videos/generated.mp4" });
    await screen.findByText("✓ Upload hoàn tất");

    fireEvent.change(screen.getByPlaceholderText("Nhập tên bài học"), {
      target: { value: "Bài video" },
    });
    fireEvent.change(screen.getByPlaceholderText("gioi-thieu"), {
      target: { value: "bai-video" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu bài học" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          videoStorageKey: "lessons/course-id/videos/generated.mp4",
          videoUrl: null,
        }),
      ),
    );
  });

  it("shows a retry action when direct video upload fails", async () => {
    vi.spyOn(courseService, "uploadLessonVideo").mockRejectedValue(
      new Error("Upload video thất bại."),
    );
    render(
      <LessonManagementForm
        courseId="course-id"
        error={null}
        isSaving={false}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Chọn video bài học"), {
      target: { files: [new File(["video"], "lesson.mp4", { type: "video/mp4" })] },
    });

    expect(await screen.findByText("Thử lại")).toBeInTheDocument();
    expect(screen.getByText("Upload video thất bại.")).toBeInTheDocument();
  });

  it("uploads a selected PDF and submits its storage key", async () => {
    vi.spyOn(courseService, "uploadLessonDocument").mockResolvedValue({
      storageKey: "lessons/course-id/documents/generated.pdf",
    });
    render(
      <LessonManagementForm
        courseId="course-id"
        error={null}
        isSaving={false}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Loại bài" }), {
      target: { value: "pdf" },
    });
    fireEvent.change(screen.getByLabelText("Chọn PDF bài học"), {
      target: {
        files: [new File(["%PDF-"], "lesson.pdf", { type: "application/pdf" })],
      },
    });

    expect(await screen.findByText("✓ Upload hoàn tất")).toBeInTheDocument();
  });

  it("preserves existing media without persisting a signed or legacy URL again", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <LessonManagementForm
        courseId="course-id"
        error={null}
        isSaving={false}
        lesson={{
          id: "lesson-id",
          courseId: "course-id",
          title: "Bài video cũ",
          slug: "bai-video-cu",
          type: "video",
          content: null,
          videoUrl: "https://signed.example/private-video.mp4?expires=300",
          documentUrl: null,
          orderIndex: 0,
          durationMinutes: 10,
          isPreview: false,
          isRequired: true,
          createdAt: "2026-08-12T00:00:00.000Z",
          updatedAt: "2026-08-12T00:00:00.000Z",
        }}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lưu bài học" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).not.toHaveProperty("videoUrl");
    expect(payload).not.toHaveProperty("videoStorageKey");
  });
});
