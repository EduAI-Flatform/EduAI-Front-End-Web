import { ApiClient, apiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export type CourseLevel = "beginner" | "intermediate" | "advanced";
export type CourseStatus = "draft" | "published" | "archived";
export type CourseVisibility = "public" | "private";

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  level: CourseLevel;
  status: CourseStatus;
  visibility: CourseVisibility;
  badge: string | null;
  featuredRank: number | null;
  price: CoursePrice | null;
  instructor: CourseInstructor;
  metrics: CourseMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface CoursePrice {
  amountMinor: number;
  currency: string;
}

export interface CourseInstructor {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  headline: string | null;
  bio?: string | null;
}

export interface CourseMetrics {
  lessonCount: number;
  durationMinutes: number;
  enrollmentCount: number;
  ratingAverage: number | null;
  ratingCount: number;
}

export type CourseDetail = CourseSummary & {
  lessonCount: number;
  instructor: CourseInstructor & { bio: string | null };
};

export interface CourseCommandResponse {
  id: string;
  status: CourseStatus;
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

export interface CourseMutationInput {
  title: string;
  slug: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  badge?: string | null;
  priceAmountMinor?: number | null;
  priceCurrency?: string | null;
  level: CourseLevel;
  visibility?: CourseVisibility;
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

export interface LessonDetail extends LessonSummary {
  content: string | null;
  videoUrl: string | null;
  documentUrl: string | null;
}

export interface LessonMutationInput {
  title: string;
  slug: string;
  type: LessonType;
  content?: string | null;
  videoUrl?: string | null;
  documentUrl?: string | null;
  orderIndex: number;
  durationMinutes?: number | null;
  isPreview?: boolean;
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

  createCourse(input: CourseMutationInput): Promise<CourseCommandResponse> {
    return authenticatedApiClient.post<CourseCommandResponse>("/courses", { ...input });
  },

  updateCourse(
    courseId: string,
    input: Partial<CourseMutationInput>,
  ): Promise<CourseCommandResponse> {
    return authenticatedApiClient.put<CourseCommandResponse>(`/courses/${courseId}`, { ...input });
  },

  publishCourse(courseId: string): Promise<CourseCommandResponse> {
    return authenticatedApiClient.post<CourseCommandResponse>(`/courses/${courseId}/publish`);
  },

  archiveCourse(courseId: string): Promise<CourseCommandResponse> {
    return authenticatedApiClient.post<CourseCommandResponse>(`/courses/${courseId}/archive`);
  },

  getCourse(courseId: string): Promise<CourseDetail> {
    return apiClient.get<CourseDetail>(`/courses/${courseId}`);
  },

  getLesson(lessonId: string): Promise<LessonDetail> {
    return authenticatedApiClient.get<LessonDetail>(`/lessons/${lessonId}`);
  },

  listCourseLessons(courseId: string): Promise<LessonSummary[]> {
    return apiClient.get<LessonSummary[]>(`/courses/${courseId}/lessons`);
  },

  listInstructorLessons(courseId: string): Promise<LessonSummary[]> {
    return authenticatedApiClient.get<LessonSummary[]>(
      `/instructor/courses/${courseId}/lessons`,
    );
  },

  createLesson(
    courseId: string,
    input: LessonMutationInput,
  ): Promise<LessonDetail> {
    return authenticatedApiClient.post<LessonDetail>(
      `/courses/${courseId}/lessons`,
      { ...input },
    );
  },

  updateLesson(
    lessonId: string,
    input: Partial<LessonMutationInput>,
  ): Promise<LessonDetail> {
    return authenticatedApiClient.put<LessonDetail>(`/lessons/${lessonId}`, {
      ...input,
    });
  },

  deleteLesson(lessonId: string): Promise<{ deleted: true }> {
    return authenticatedApiClient.delete<{ deleted: true }>(`/lessons/${lessonId}`);
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
