import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LessonPlayer } from "./LessonPlayer";

const pdfLesson = {
  id: "lesson-1",
  courseId: "course-1",
  title: "Neural Networks",
  slug: "neural-networks",
  type: "pdf" as const,
  orderIndex: 1,
  durationMinutes: 20,
  isPreview: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  content: null,
  videoUrl: null,
  documentUrl: "https://example.com/neural-networks.pdf",
};

describe("LessonPlayer", () => {
  it("exposes lesson navigation and completion actions", () => {
    render(
      <LessonPlayer
        actionMessage={null}
        hasNext
        hasPrevious
        initialPositionSeconds={0}
        isComplete={false}
        isLoading={false}
        lesson={pdfLesson}
        loadError={null}
        onComplete={vi.fn()}
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        onProgress={vi.fn()}
        progressPercent={40}
      />,
    );

    expect(screen.getByRole("button", { name: "Bài trước" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Hoàn thành bài học" })).toBeEnabled();
    expect(screen.getByRole("link", { name: /Mở trong tab mới/i })).toHaveAttribute(
      "href",
      pdfLesson.documentUrl,
    );
  });
});
