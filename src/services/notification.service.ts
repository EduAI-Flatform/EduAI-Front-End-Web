import { ApiClient } from "./api-client";
import { getAuthSession } from "./auth.service";

export interface InAppNotification {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: InAppNotification[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface NotificationListOptions {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

export type NotificationChannel = "in_app" | "email";
export type NotificationCategory = "system" | "assignment" | "grade" | "classroom" | "certificate";

export interface NotificationPreference {
  channel: NotificationChannel;
  category: NotificationCategory;
  isEnabled: boolean;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const notificationService = {
  list(options: NotificationListOptions = {}): Promise<NotificationPage> {
    const query = new URLSearchParams({
      page: String(options.page ?? 1),
      pageSize: String(options.pageSize ?? 25),
    });

    if (options.unreadOnly) {
      query.set("unreadOnly", "true");
    }

    return authenticatedApiClient.get<NotificationPage>(
      `/notifications?${query.toString()}`,
    );
  },

  unreadCount(): Promise<{ unreadCount: number }> {
    return authenticatedApiClient.get<{ unreadCount: number }>(
      "/notifications/unread-count",
    );
  },

  markAsRead(notificationId: string): Promise<InAppNotification> {
    return authenticatedApiClient.patch<InAppNotification>(
      `/notifications/${encodeURIComponent(notificationId)}/read`,
    );
  },

  markAllAsRead(): Promise<{ updatedCount: number }> {
    return authenticatedApiClient.patch<{ updatedCount: number }>(
      "/notifications/read-all",
    );
  },

  getPreferences(): Promise<NotificationPreference[]> {
    return authenticatedApiClient.get<NotificationPreference[]>("/notifications/preferences");
  },

  setPreference(preference: NotificationPreference): Promise<NotificationPreference> {
    return authenticatedApiClient.put<NotificationPreference>(
      "/notifications/preferences",
      {
        category: preference.category,
        channel: preference.channel,
        isEnabled: preference.isEnabled,
      },
    );
  },
};
