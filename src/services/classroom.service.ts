import { ApiClient, ApiClientError, getApiBaseUrl } from "./api-client";
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

export interface StartedClassroomSession {
  id: string;
  roomName: string;
  meetingUrl: string;
  status: ClassroomSessionStatus;
  actualStart: string | null;
}

export interface JoinedClassroomSession {
  id: string;
  roomName: string;
  meetingUrl: string;
}

export interface ClassroomAttendance {
  id: string;
  sessionId: string;
  userId: string;
  joinedAt: string;
  leftAt: string | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const classroomService = {
  getSession(sessionId: string): Promise<ClassroomSession> {
    return authenticatedApiClient.get<ClassroomSession>(
      `/classroom-sessions/${sessionId}`,
    );
  },

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

  startSession(sessionId: string): Promise<StartedClassroomSession> {
    return authenticatedApiClient.post<StartedClassroomSession>(
      `/classroom-sessions/${sessionId}/start`,
    );
  },

  joinSession(sessionId: string): Promise<JoinedClassroomSession> {
    return authenticatedApiClient.post<JoinedClassroomSession>(
      `/classroom-sessions/${sessionId}/join`,
    );
  },

  recordAttendance(
    sessionId: string,
    event: "join" | "leave",
  ): Promise<ClassroomAttendance> {
    return authenticatedApiClient.post<ClassroomAttendance>(
      `/classroom-sessions/${sessionId}/attendance`,
      { event },
    );
  },

  recordAttendanceKeepalive(sessionId: string, event: "join" | "leave"): void {
    const token = getAuthSession()?.accessToken;

    if (!token) return;

    void fetch(buildApiUrl(`/classroom-sessions/${sessionId}/attendance`), {
      body: JSON.stringify({ event }),
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      keepalive: true,
      method: "POST",
    }).catch(() => undefined);
  },
};

export function getClassroomErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Không thể tải lớp trực tuyến. Vui lòng thử lại.";
}

function buildApiUrl(path: string): string {
  return `${getApiBaseUrl().replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
