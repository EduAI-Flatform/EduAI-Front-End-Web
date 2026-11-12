import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { quizService, type QuizSummary } from "../../../../../services/quiz.service";
import { LessonQuizPicker } from "./LessonQuizPicker";

afterEach(() => vi.restoreAllMocks());
describe("lesson quiz selection", () => {
  it("attaches an unassigned quiz without offering quizzes attached to another lesson", async () => {
    const unattached = { id: "quiz-1", title: "Quick check", lessonId: null, status: "draft" } as QuizSummary;
    vi.spyOn(quizService, "listCourseQuizzes").mockResolvedValue([unattached,
      { ...unattached, id: "quiz-2", title: "Other lesson check", lessonId: "other-lesson" }]);
    const attach = vi.spyOn(quizService, "attachToLesson").mockResolvedValue({ ...unattached, lessonId: "lesson-1" });
    render(<MemoryRouter><LessonQuizPicker courseId="course-1" lessonId="lesson-1" /></MemoryRouter>);
    await screen.findByRole("option", { name: "Quick check" });
    expect(screen.queryByRole("option", { name: "Other lesson check" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "quiz-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Gắn quiz" }));
    await waitFor(() => expect(attach).toHaveBeenCalledWith("quiz-1", "lesson-1"));
    expect(await screen.findByRole("status")).toHaveTextContent("Đã gắn quiz");
    expect(screen.getByRole("link", { name: "Tạo quiz cho bài học này" })).toHaveAttribute("href", "/instructor/dashboard/courses/course-1/quizzes?lesson=lesson-1");
  });
  it("does not create or attach quizzes before a lesson has been saved", () => {
    const attach = vi.spyOn(quizService, "attachToLesson");
    render(<LessonQuizPicker courseId="course-1" />);
    expect(screen.getByText(/Lưu bài học trước/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(attach).not.toHaveBeenCalled();
  });
});
