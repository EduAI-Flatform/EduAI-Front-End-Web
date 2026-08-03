import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";
import type { Certificate } from "./certificate.service";

export interface StudentCourseProgress {
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  completedMinutes: number;
  totalMinutes: number;
  remainingMinutes: number;
}

export interface StudentActiveCourse {
  enrollmentId: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
    badge: string | null;
  };
  progress: StudentCourseProgress;
  lastAccessedAt: string | null;
  nextLesson: { id: string; title: string } | null;
}

export interface DashboardSession {
  id: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  meetingUrl: string | null;
  status: string;
  course: { id: string; title: string; slug: string };
  instructor: { id: string; fullName: string; avatarUrl: string | null };
}

export interface WeeklyCompletedMinutes {
  date: string;
  minutes: number;
}

export interface StudentDashboardStatistics {
  completedMinutes: number;
  completedCourses: number;
  averageQuizScore: number | null;
  completedLessons: number;
}

export interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  occurredAt: string;
  courseId: string | null;
  courseTitle: string | null;
  score: number | null;
}

export interface StudentDashboardData {
  activeCourses: StudentActiveCourse[];
  continueCourse: StudentActiveCourse | null;
  upcomingSessions: DashboardSession[];
  weeklyCompletedMinutes: WeeklyCompletedMinutes[];
  statistics: StudentDashboardStatistics;
  certificates: Certificate[];
  recentActivity: DashboardActivity[];
}

export type InstructorQueueType = "submission" | "session" | "draft_course";
export type InstructorQueuePriority = "urgent" | "normal";

export interface InstructorWorkQueueItem {
  id: string;
  type: InstructorQueueType;
  title: string;
  description: string;
  dueAt: string | null;
  priority: InstructorQueuePriority;
}

export interface InstructorDashboardData {
  statistics: {
    publishedCourses: number;
    activeStudents: number;
    pendingSubmissions: number;
    upcomingSessions: number;
    todaySessions: number;
    completionRate: number;
  };
  upcomingSessions: DashboardSession[];
  workQueue: InstructorWorkQueueItem[];
}

export interface WeeklyActivityBar extends WeeklyCompletedMinutes {
  label: string;
  value: number;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const dashboardService = {
  getStudentDashboard(): Promise<StudentDashboardData> {
    return authenticatedApiClient.get<StudentDashboardData>("/me/dashboard");
  },

  getInstructorDashboard(): Promise<InstructorDashboardData> {
    return authenticatedApiClient.get<InstructorDashboardData>(
      "/instructor/dashboard",
    );
  },
};

export function getWeeklyActivityBars(
  items: WeeklyCompletedMinutes[],
): WeeklyActivityBar[] {
  const maximum = Math.max(0, ...items.map(({ minutes }) => minutes));

  return items.map((item) => ({
    ...item,
    label: new Intl.DateTimeFormat("vi-VN", {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(`${item.date}T00:00:00.000Z`)),
    value: maximum === 0 ? 0 : Math.round((item.minutes / maximum) * 100),
  }));
}

export function formatLearningMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} phút`;
  }

  return remainingMinutes > 0
    ? `${hours} giờ ${remainingMinutes} phút`
    : `${hours} giờ`;
}

export function getDashboardErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Không thể tải bảng điều khiển. Vui lòng thử lại.";
}
