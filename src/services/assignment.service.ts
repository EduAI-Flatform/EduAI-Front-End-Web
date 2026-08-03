import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export type AssignmentStatus = "draft" | "published" | "archived";
export type SubmissionStatus = "submitted" | "graded";

export interface AssignmentSummary {
  id: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentMutationInput {
  title: string;
  description?: string | null;
  lessonId?: string;
  dueDate?: string | null;
  maxScore: number;
}

export interface SubmissionSummary {
  id: string;
  assignmentId: string;
  userId: string;
  content: string | null;
  fileUrl: string | null;
  score: number | null;
  feedback: string | null;
  status: SubmissionStatus;
  submittedAt: string;
  gradedAt: string | null;
  gradedById: string | null;
  createdAt: string;
  updatedAt: string;
  isLate: boolean;
  student: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export interface SubmitAssignmentInput {
  content?: string | null;
  fileUrl?: string | null;
}

export interface GradeSubmissionInput {
  score: number;
  feedback?: string | null;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const assignmentService = {
  listCourseAssignments(courseId: string): Promise<AssignmentSummary[]> {
    return authenticatedApiClient.get<AssignmentSummary[]>(
      `/courses/${courseId}/assignments`,
    );
  },

  getAssignment(assignmentId: string): Promise<AssignmentSummary> {
    return authenticatedApiClient.get<AssignmentSummary>(`/assignments/${assignmentId}`);
  },

  createAssignment(
    courseId: string,
    input: AssignmentMutationInput,
  ): Promise<AssignmentSummary> {
    return authenticatedApiClient.post<AssignmentSummary>(
      `/courses/${courseId}/assignments`,
      { ...input },
    );
  },

  publishAssignment(assignmentId: string): Promise<AssignmentSummary> {
    return authenticatedApiClient.post<AssignmentSummary>(
      `/assignments/${assignmentId}/publish`,
    );
  },

  deleteAssignment(assignmentId: string): Promise<{ deleted: true }> {
    return authenticatedApiClient.delete<{ deleted: true }>(
      `/assignments/${assignmentId}`,
    );
  },

  submitAssignment(
    assignmentId: string,
    input: SubmitAssignmentInput,
  ): Promise<SubmissionSummary> {
    return authenticatedApiClient.post<SubmissionSummary>(
      `/assignments/${assignmentId}/submissions`,
      { ...input },
    );
  },

  getMySubmission(assignmentId: string): Promise<SubmissionSummary> {
    return authenticatedApiClient.get<SubmissionSummary>(
      `/assignments/${assignmentId}/submissions/me`,
    );
  },

  listSubmissions(assignmentId: string): Promise<SubmissionSummary[]> {
    return authenticatedApiClient.get<SubmissionSummary[]>(
      `/assignments/${assignmentId}/submissions`,
    );
  },

  gradeSubmission(
    submissionId: string,
    input: GradeSubmissionInput,
  ): Promise<SubmissionSummary> {
    return authenticatedApiClient.post<SubmissionSummary>(
      `/submissions/${submissionId}/grade`,
      { ...input },
    );
  },
};

export function getAssignmentErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Không thể xử lý bài tập. Vui lòng thử lại.";
}
