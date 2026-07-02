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
  enrollCourse(courseId: string): Promise<Enrollment> {
    return authenticatedApiClient.post<Enrollment>(`/courses/${courseId}/enroll`);
  },

  listMyEnrollments(): Promise<Enrollment[]> {
    return authenticatedApiClient.get<Enrollment[]>("/me/enrollments");
  },
};

export function getEnrollmentErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Vui lòng đăng nhập để tiếp tục.";
    }

    if (error.status === 403) {
      return "Tài khoản của bạn không có quyền thực hiện thao tác này.";
    }

    if (error.status === 404) {
      return "Không tìm thấy khóa học này.";
    }

    return "Không thể xử lý yêu cầu ghi danh. Vui lòng thử lại.";
  }

  if (error instanceof Error) {
    return "Không thể kết nối đến hệ thống. Vui lòng thử lại.";
  }

  return "Không thể xử lý yêu cầu ghi danh. Vui lòng thử lại.";
}
