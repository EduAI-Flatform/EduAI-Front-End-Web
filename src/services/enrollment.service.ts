import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";
import type {
  CourseLevel,
  CourseStatus,
  CourseVisibility,
} from "./course.service";

export interface EnrollmentCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  level: CourseLevel;
  status: CourseStatus;
  visibility: CourseVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentProgress {
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
}

export interface Enrollment {
  id: string;
  courseId: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  course: EnrollmentCourse;
  progress: EnrollmentProgress;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const enrollmentService = {
  listMyEnrollments(): Promise<Enrollment[]> {
    return authenticatedApiClient.get<Enrollment[]>("/me/enrollments");
  },
};

export function getEnrollmentErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Không thể tải khóa học của bạn. Vui lòng thử lại.";
}
