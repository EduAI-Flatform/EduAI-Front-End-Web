import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export const ADMIN_AUDIT_ACTIONS = [
  "AUTH_LOGIN",
  "USER_ROLE_CHANGED",
  "USER_STATUS_CHANGED",
  "COURSE_PUBLISHED",
  "QUIZ_PUBLISHED",
  "ASSIGNMENT_PUBLISHED",
  "SUBMISSION_GRADED",
  "CERTIFICATE_ISSUED",
  "CERTIFICATE_REVOKED",
  "COMMUNITY_POST_MODERATED",
  "COMMUNITY_POST_REMOVED",
  "COMMUNITY_COMMENT_REMOVED",
  "CONTENT_MODERATION_CHANGED",
] as const;

export interface AdminAuditLogItem {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadataJson: Record<string, unknown>;
  occurredAt: string;
  actor: {
    id: string;
    email: string;
    fullName: string;
  };
}

export interface AdminAuditLogPage {
  items: AdminAuditLogItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminAuditLogQuery {
  page: number;
  pageSize: number;
  search?: string;
  action?: string;
  targetType?: string;
  occurredAfter?: string;
  occurredBefore?: string;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const adminAuditService = {
  list(query: AdminAuditLogQuery): Promise<AdminAuditLogPage> {
    const searchParams = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
    });

    for (const [key, value] of Object.entries({
      search: query.search,
      action: query.action,
      targetType: query.targetType,
      occurredAfter: query.occurredAfter,
      occurredBefore: query.occurredBefore,
    })) {
      if (value) searchParams.set(key, value);
    }

    return authenticatedApiClient.get<AdminAuditLogPage>(
      `/admin/audit-logs?${searchParams.toString()}`,
    );
  },
};

export function getAdminAuditErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Không thể tải nhật ký kiểm toán. Vui lòng thử lại.";
}
