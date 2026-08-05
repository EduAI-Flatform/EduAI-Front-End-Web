import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export interface CourseProgress {
  courseId: string;
  completedLessonIds: string[];
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  completed: boolean;
}

export type LearningStepType = "LESSON" | "ASSIGNMENT" | "QUIZ";
export type LearningStepStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED";

export interface LearningStep {
  id: string;
  type: LearningStepType;
  title: string;
  position: number;
  status: LearningStepStatus;
  lockedReason: string | null;
  lessonId?: string | null;
  isPreview?: boolean;
  progressPercent?: number;
  watchedSeconds?: number;
  durationSeconds?: number | null;
  lastPositionSeconds?: number;
  documentProgressPercent?: number;
}

export interface LearningPath {
  courseId: string;
  steps: LearningStep[];
  currentStep: LearningStep | null;
  nextStep: LearningStep | null;
  completedLessonIds: string[];
  completedSteps: number;
  totalSteps: number;
  progressPercent: number;
  completed: boolean;
}

export interface UpdateLessonProgressInput {
  watchedSeconds?: number;
  durationSeconds?: number;
  lastPositionSeconds?: number;
  documentProgressPercent?: number;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const learningService = {
  getLearningPath(courseId: string): Promise<LearningPath> {
    return authenticatedApiClient.get<LearningPath>(
      `/courses/${courseId}/learning-path`,
    );
  },

  updateLessonProgress(
    lessonId: string,
    input: UpdateLessonProgressInput,
  ): Promise<LearningPath> {
    return authenticatedApiClient.patch<LearningPath>(
      `/lessons/${lessonId}/progress`,
      input as Record<string, unknown>,
    );
  },

  getCourseProgress(courseId: string): Promise<CourseProgress> {
    return authenticatedApiClient.get<CourseProgress>(`/courses/${courseId}/progress`);
  },

  completeLesson(lessonId: string): Promise<CourseProgress> {
    return authenticatedApiClient.post<CourseProgress>(`/lessons/${lessonId}/complete`);
  },
};

export function getLearningErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Không thể tải bài học. Vui lòng thử lại.";
}
