import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export type ClassroomSessionStatus =
  | "scheduled"
  | "live"
  | "ended"
  | "cancelled";

export interface ClassroomSession {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  provider: "jitsi";
  meetingUrl: string | null;
  roomName: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  status: ClassroomSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClassroomSessionInput {
  title: string;
  description?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const classroomService = {
  listSessions(courseId: string): Promise<ClassroomSession[]> {
    return authenticatedApiClient.get<ClassroomSession[]>(
      `/courses/${courseId}/classroom-sessions`,
    );
  },

  createSession(
    courseId: string,
    input: ClassroomSessionInput,
  ): Promise<ClassroomSession> {
    return authenticatedApiClient.post<ClassroomSession>(
      `/courses/${courseId}/classroom-sessions`,
      { ...input },
    );
  },
};

export function getClassroomErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Không thể tải lớp trực tuyến. Vui lòng thử lại.";
}
