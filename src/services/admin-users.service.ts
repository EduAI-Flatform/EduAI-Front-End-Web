import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export type AdminUserRole = "student" | "instructor" | "platform_admin";
export type AdminUserStatus = "active" | "inactive" | "suspended";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  status: AdminUserStatus;
  authProvider: "local" | "google";
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  roles: AdminUserRole[];
}

export interface AdminUserPage {
  items: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminUserQuery {
  page: number;
  pageSize: number;
  search?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const adminUsersService = {
  list(query: AdminUserQuery): Promise<AdminUserPage> {
    const searchParams = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
    });
    for (const [key, value] of Object.entries({
      search: query.search,
      role: query.role,
      status: query.status,
    })) {
      if (value) searchParams.set(key, value);
    }

    return authenticatedApiClient.get<AdminUserPage>(
      `/admin/users?${searchParams.toString()}`,
    );
  },

  get(userId: string): Promise<AdminUser> {
    return authenticatedApiClient.get<AdminUser>(`/admin/users/${userId}`);
  },

  updateStatus(
    userId: string,
    status: Extract<AdminUserStatus, "active" | "suspended">,
  ): Promise<AdminUser> {
    return authenticatedApiClient.patch<AdminUser>(
      `/admin/users/${userId}/status`,
      { status },
    );
  },

  updateRoles(userId: string, roles: AdminUserRole[]): Promise<AdminUser> {
    return authenticatedApiClient.patch<AdminUser>(
      `/admin/users/${userId}/roles`,
      { roles },
    );
  },
};

export function getAdminUserErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Không thể xử lý yêu cầu quản trị người dùng.";
}
