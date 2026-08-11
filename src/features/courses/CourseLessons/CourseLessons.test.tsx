import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AssignmentSummary } from "../../../services/assignment.service";
import type { LessonSummary } from "../../../services/course.service";
import { CourseLessons } from "./CourseLessons";

const lessons: LessonSummary[] = [
  {
    id: "lesson-1",
    courseId: "course-1",
    title: "Bài video mở đầu",
    slug: "bai-video-mo-dau",
    type: "video",
    orderIndex: 1,
    durationMinutes: 10,
    isPreview: true,
    isRequired: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "lesson-2",
    courseId: "course-1",
    title: "Bài bị khóa",
    slug: "bai-bi-khoa",
    type: "article",
    orderIndex: 2,
    durationMinutes: null,
    isPreview: false,
    isRequired: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const assignment: AssignmentSummary = {
  id: "assignment-1",
  courseId: "course-1",
  lessonId: "lesson-1",
  title: "Bài tập thực hành",
  description: "Mô tả bài tập",
  dueDate: null,
  maxScore: 10,
  isRequired: true,
  status: "published",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("CourseLessons", () => {
  it("switches tabs and shows assignments", () => {
    const onTabChange = vi.fn();
    render(
      <CourseLessons
        activeTab="lessons"
        assignments={[assignment]}
        courseDescription="Mô tả khóa học"
        isEnrolled
        lessons={lessons}
        onLessonSelect={vi.fn()}
        onTabChange={onTabChange}
      />,
    );

    expect(screen.getByText("Bài video mở đầu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Bài tập" }));
    expect(onTabChange).toHaveBeenCalledWith("assignments");
  });

  it("opens preview lessons and keeps non-preview lessons disabled for visitors", () => {
    const onLessonSelect = vi.fn();
    render(
      <CourseLessons
        activeTab="lessons"
        assignments={[]}
        courseDescription={null}
        isEnrolled={false}
        lessons={lessons}
        onLessonSelect={onLessonSelect}
        onTabChange={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons.find((button) => button.textContent?.includes("Bài video mở đầu"))!);
    expect(onLessonSelect).toHaveBeenCalledWith(lessons[0]);
    expect(buttons.find((button) => button.textContent?.includes("Bài bị khóa"))).toBeDisabled();
  });
});
