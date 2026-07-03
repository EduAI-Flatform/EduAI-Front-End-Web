import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export type QuizStatus = "draft" | "published" | "archived";
export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

export interface QuizSummary {
  id: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  passingScore: number;
  timeLimitMinutes: number | null;
  status: QuizStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionSummary {
  id: string;
  quizId: string;
  type: QuestionType;
  questionText: string;
  optionsJson: unknown;
  correctAnswerJson?: unknown;
  explanation?: string | null;
  points: number;
  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentQuiz extends QuizSummary {
  questions: Array<Omit<QuestionSummary, "correctAnswerJson" | "explanation">>;
}

export interface QuizMutationInput {
  title: string;
  description?: string | null;
  lessonId?: string;
  passingScore: number;
  timeLimitMinutes?: number;
}

export interface QuestionMutationInput {
  type: QuestionType;
  questionText: string;
  optionsJson?: unknown[];
  correctAnswerJson: unknown;
  explanation?: string | null;
  points: number;
  orderIndex: number;
}

export interface QuizAttemptResult {
  id: string;
  quizId: string;
  score: number | null;
  maxScore: number | null;
  scorePercent: number;
  passed: boolean | null;
  startedAt: string;
  submittedAt: string | null;
  createdAt: string;
}

export interface SubmitQuizAttemptInput {
  answers: Array<{
    questionId: string;
    answer: unknown;
  }>;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const quizService = {
  listCourseQuizzes(courseId: string): Promise<QuizSummary[]> {
    return authenticatedApiClient.get<QuizSummary[]>(`/courses/${courseId}/quizzes`);
  },

  listAvailableCourseQuizzes(courseId: string): Promise<QuizSummary[]> {
    return authenticatedApiClient.get<QuizSummary[]>(
      `/courses/${courseId}/quizzes/available`,
    );
  },

  listStudentCourseQuizzes(courseId: string): Promise<QuizSummary[]> {
    return authenticatedApiClient.get<QuizSummary[]>(
      `/courses/${courseId}/quizzes/available`,
    );
  },

  createQuiz(courseId: string, input: QuizMutationInput): Promise<QuizSummary> {
    return authenticatedApiClient.post<QuizSummary>(`/courses/${courseId}/quizzes`, {
      ...input,
    });
  },

  publishQuiz(quizId: string): Promise<QuizSummary> {
    return authenticatedApiClient.post<QuizSummary>(`/quizzes/${quizId}/publish`);
  },

  deleteQuiz(quizId: string): Promise<{ deleted: true }> {
    return authenticatedApiClient.delete<{ deleted: true }>(`/quizzes/${quizId}`);
  },

  listQuestions(quizId: string): Promise<QuestionSummary[]> {
    return authenticatedApiClient.get<QuestionSummary[]>(`/quizzes/${quizId}/questions`);
  },

  createQuestion(
    quizId: string,
    input: QuestionMutationInput,
  ): Promise<QuestionSummary> {
    return authenticatedApiClient.post<QuestionSummary>(
      `/quizzes/${quizId}/questions`,
      { ...input },
    );
  },

  getStudentQuiz(quizId: string): Promise<StudentQuiz> {
    return authenticatedApiClient.get<StudentQuiz>(`/quizzes/${quizId}/take`);
  },

  listMyAttempts(quizId: string): Promise<QuizAttemptResult[]> {
    return authenticatedApiClient.get<QuizAttemptResult[]>(
      `/quizzes/${quizId}/attempts/me`,
    );
  },

  submitAttempt(
    quizId: string,
    input: SubmitQuizAttemptInput,
  ): Promise<QuizAttemptResult> {
    return authenticatedApiClient.post<QuizAttemptResult>(
      `/quizzes/${quizId}/attempts`,
      { ...input },
    );
  },
};

export function getQuizErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Không thể xử lý quiz. Vui lòng thử lại.";
}
