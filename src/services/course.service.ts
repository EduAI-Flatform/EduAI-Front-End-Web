import { ApiClient, apiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export type CourseLevel = "beginner" | "intermediate" | "advanced";
export type CourseStatus = "draft" | "published" | "archived";
export type CourseVisibility = "public" | "private";

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
  level: CourseLevel;
  status: CourseStatus;
  visibility: CourseVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface CourseDetail extends CourseSummary {
  lessonCount: number;
}

export interface PaginatedCourses {
  items: CourseSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListInstructorCoursesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CourseStatus;
}

export type LessonType = "video" | "pdf" | "article";

export interface LessonSummary {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  type: LessonType;
  orderIndex: number;
  durationMinutes: number | null;
  isPreview: boolean;
  createdAt: string;
  updatedAt: string;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const courseService = {
  listPublishedCourses(): Promise<CourseSummary[]> {
    return apiClient.get<CourseSummary[]>("/courses");
  },

  listInstructorCourses(
    params: ListInstructorCoursesParams = {},
  ): Promise<PaginatedCourses> {
    const query = new URLSearchParams();

    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    if (params.status) query.set("status", params.status);
    if (params.search?.trim()) query.set("search", params.search.trim());

    const suffix = query.toString() ? `?${query.toString()}` : "";
    return authenticatedApiClient.get<PaginatedCourses>(
      `/instructor/courses${suffix}`,
    );
  },

  getCourse(courseId: string): Promise<CourseDetail> {
    return apiClient.get<CourseDetail>(`/courses/${courseId}`);
  },

  listCourseLessons(courseId: string): Promise<LessonSummary[]> {
    return apiClient.get<LessonSummary[]>(`/courses/${courseId}/lessons`);
  },
};

export function getCourseErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Không thể tải danh sách khóa học. Vui lòng thử lại.";
}
