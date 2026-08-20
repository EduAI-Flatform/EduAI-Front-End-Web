import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export interface AiLearningPathCourse {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  level: string;
  progressPercent: number;
  enrollmentStatus: string | null;
}

export interface AiLearningPathMilestone {
  courseId: string;
  reason: string;
  priority: number;
  available: boolean;
  course: AiLearningPathCourse | null;
}

export interface AiLearningPath {
  id: string;
  version: number;
  createdAt: string;
  path: { schemaVersion: "v1"; milestones: AiLearningPathMilestone[] };
}

export interface GeneratedAiLearningPath {
  id: string;
  version: number;
  path: {
    schemaVersion: "v1";
    milestones: Array<Pick<AiLearningPathMilestone, "courseId" | "priority" | "reason">>;
  };
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const aiLearningPathService = {
  getCurrent(): Promise<AiLearningPath | null> {
    return authenticatedApiClient.get<AiLearningPath | null>("/ai/learning-paths/current");
  },
  regenerate(): Promise<GeneratedAiLearningPath> {
    return authenticatedApiClient.post<GeneratedAiLearningPath>("/ai/learning-paths/regenerate");
  },
};

export function getLearningPathErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 429) return "Bạn đã đạt giới hạn tạo lộ trình hôm nay.";
    if (error.status === 502 || error.status === 504) return "AI đang phản hồi chậm. Hãy thử tạo lại sau ít phút.";
    return error.message;
  }
  return "Không thể tải lộ trình học tập. Vui lòng thử lại.";
}
