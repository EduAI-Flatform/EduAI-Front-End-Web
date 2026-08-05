import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { QuizAttemptPage } from "./QuizAttemptPage";

const quizServiceMock = vi.hoisted(() => ({
  getStudentQuiz: vi.fn(),
  listMyAttempts: vi.fn(),
  submitAttempt: vi.fn(),
}));

vi.mock("../../../services/quiz.service", () => ({
  getQuizErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "error"),
  quizService: quizServiceMock,
}));

const quiz = {
  id: "quiz-1",
  courseId: "course-1",
  lessonId: null,
  title: "Kiểm tra đầu vào",
  description: null,
  passingScore: 70,
  timeLimitMinutes: null,
  status: "published" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  questions: [
    {
      id: "question-1",
      quizId: "quiz-1",
      type: "multiple_choice" as const,
      questionText: "2 + 2 bằng bao nhiêu?",
      optionsJson: ["3", "4"],
      points: 1,
      orderIndex: 1,
    },
  ],
};

describe("QuizAttemptPage", () => {
  it("locks submitted answers, shows correctness, and resets for a new attempt", async () => {
    quizServiceMock.getStudentQuiz.mockResolvedValue(quiz);
    quizServiceMock.listMyAttempts.mockResolvedValue([]);
    quizServiceMock.submitAttempt.mockResolvedValue({
      id: "attempt-1",
      quizId: "quiz-1",
      score: 1,
      maxScore: 1,
      scorePercent: 100,
      passed: true,
      startedAt: "2026-01-01T00:00:00.000Z",
      submittedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      answers: [{ questionId: "question-1", answer: "4", isCorrect: true }],
    });

    render(
      <MemoryRouter initialEntries={["/quizzes/quiz-1/take"]}>
        <Routes>
          <Route element={<QuizAttemptPage />} path="/quizzes/:quizId/take" />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Kiểm tra đầu vào")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("4"));
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Làm lại" })).toBeInTheDocument());
    expect(screen.getByLabelText("4")).toBeDisabled();
    expect(screen.getByText("Đúng")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Làm lại" }));
    expect(screen.getByRole("button", { name: "Nộp bài" })).toBeInTheDocument();
    expect(screen.getByLabelText("4")).not.toBeChecked();
  });
});
