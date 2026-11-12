import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
  isRequired: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  content: null,
  videoUrl: null,
  documentUrl: "https://example.com/neural-networks.pdf",
};

describe("LessonPlayer", () => {
  it("offers linked quizzes only after video ends and never auto-submits an attempt", () => {
    const complete = vi.fn();
    const progress = vi.fn();
    const { container } = render(<MemoryRouter><LessonPlayer actionMessage={null} hasNext={false} hasPrevious={false}
      initialPositionSeconds={0} isComplete={false} isLoading={false}
      lesson={{ ...pdfLesson, type: "video", videoUrl: "https://example.com/lesson.mp4", documentUrl: null }}
      loadError={null} onComplete={complete} onNext={vi.fn()} onPrevious={vi.fn()} onProgress={progress} progressPercent={0}
      postVideoQuizzes={[{ id: "quiz-1", title: "Kiểm tra nhanh" }]} /></MemoryRouter>);
    expect(screen.queryByRole("region", { name: "Quiz cuối video" })).not.toBeInTheDocument();
    const video = container.querySelector("video")!;
    Object.defineProperty(video, "duration", { configurable: true, value: 60 });
    fireEvent.ended(video);
    expect(screen.getByRole("link", { name: /Kiểm tra nhanh/ })).toHaveAttribute("href", "/quizzes/quiz-1/take");
    expect(complete).not.toHaveBeenCalled();
    expect(progress).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Để sau" }));
    fireEvent.ended(video);
    expect(screen.queryByRole("link", { name: /Kiểm tra nhanh/ })).not.toBeInTheDocument();
  });
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

  it("surfaces the lesson overview and takeaway from real lesson content", () => {
    render(
      <LessonPlayer
        actionMessage={null}
        hasNext={false}
        hasPrevious={false}
        initialPositionSeconds={0}
        isComplete={false}
        isLoading={false}
        lesson={{
          ...pdfLesson,
          content: "Neural networks learn patterns from connected layers.\n\nEach layer transforms the input into a more useful representation.",
        }}
        loadError={null}
        onComplete={vi.fn()}
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        onProgress={vi.fn()}
        progressPercent={20}
      />,
    );

    expect(screen.getByText("Neural networks learn patterns from connected layers.")).toBeInTheDocument();
    expect(screen.getByText("Kiến thức trọng tâm")).toBeInTheDocument();
    expect(screen.getByText("Each layer transforms the input into a more useful representation.")).toBeInTheDocument();
  });

  it("uses the lesson title as the reading header for text lessons", () => {
    render(
      <LessonPlayer
        actionMessage={null}
        hasNext={false}
        hasPrevious={false}
        initialPositionSeconds={0}
        isComplete={false}
        isLoading={false}
        lesson={{
          ...pdfLesson,
          title: "Understanding activation functions",
          type: "article",
          documentUrl: null,
          content: "Activation functions help a model learn non-linear patterns.\n\nThey are applied after each neuron computes its weighted input.",
        }}
        loadError={null}
        onComplete={vi.fn()}
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        onProgress={vi.fn()}
        progressPercent={0}
      />,
    );

    expect(screen.getByRole("heading", { name: "Understanding activation functions" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Nội dung bài học" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Nội dung bài học" })).not.toBeInTheDocument();
  });
});
