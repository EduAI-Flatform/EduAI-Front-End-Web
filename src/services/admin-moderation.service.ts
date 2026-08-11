import { ApiClient, ApiClientError } from "./api-client";
import type { AdminAuditLogItem } from "./admin-audit.service";
import { getAuthSession } from "./auth.service";

export const ADMIN_MODERATION_TARGET_TYPES = [
  "course",
  "library_resource",
  "community_post",
  "community_comment",
] as const;

export type AdminModerationTargetType =
  (typeof ADMIN_MODERATION_TARGET_TYPES)[number];
export type AdminModerationStatus =
  | "clear"
  | "hidden"
  | "rejected"
  | "archived";
export type AdminModerationAction =
  | "hide"
  | "reject"
  | "archive"
  | "restore";

export interface AdminModerationItem {
  id: string;
  targetType: AdminModerationTargetType;
  title: string;
  content: string | null;
  owner: {
    id: string;
    fullName: string;
  };
  moderationStatus: AdminModerationStatus;
  moderationReason: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminModerationPage {
  items: AdminModerationItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminModerationDetail {
  item: AdminModerationItem;
  history: AdminAuditLogItem[];
}

export interface AdminModerationQuery {
  targetType: AdminModerationTargetType;
  status?: AdminModerationStatus;
  search?: string;
  page: number;
  pageSize: number;
}

export interface AdminModerationCommand {
  action: AdminModerationAction;
  reason: string;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const adminModerationService = {
  list(query: AdminModerationQuery): Promise<AdminModerationPage> {
    const searchParams = new URLSearchParams({
      targetType: query.targetType,
      page: String(query.page),
      pageSize: String(query.pageSize),
    });
    if (query.status) searchParams.set("status", query.status);
    if (query.search) searchParams.set("search", query.search);

    return authenticatedApiClient.get<AdminModerationPage>(
      `/admin/moderation?${searchParams.toString()}`,
    );
  },

  get(
    targetType: AdminModerationTargetType,
    targetId: string,
  ): Promise<AdminModerationDetail> {
    return authenticatedApiClient.get<AdminModerationDetail>(
      `/admin/moderation/${targetType}/${targetId}`,
    );
  },

  moderate(
    targetType: AdminModerationTargetType,
    targetId: string,
    command: AdminModerationCommand,
  ): Promise<AdminModerationItem> {
    return authenticatedApiClient.patch<AdminModerationItem>(
      `/admin/moderation/${targetType}/${targetId}`,
      command,
    );
  },
};

export function getAdminModerationErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Không thể xử lý yêu cầu kiểm duyệt. Vui lòng thử lại.";
}
