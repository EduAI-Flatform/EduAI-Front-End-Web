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

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const learningService = {
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
