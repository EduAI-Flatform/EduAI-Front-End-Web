import { Bell, CheckCheck, ChevronLeft, ChevronRight, LoaderCircle, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  notificationService,
  type InAppNotification,
  type NotificationCategory,
  type NotificationPage,
  type NotificationPreference,
} from "../../services/notification.service";
import { useAuthSession } from "../auth/auth-store";
import { getNotificationDestination } from "./notification-destination";
import { useNotificationStream } from "./use-notification-stream";
import "./NotificationCenter.css";

const pageSize = 25;
const emailCategories: Array<{ category: NotificationCategory; label: string }> = [
  { category: "assignment", label: "Bài tập" },
  { category: "grade", label: "Điểm số" },
  { category: "classroom", label: "Lớp học" },
  { category: "certificate", label: "Chứng chỉ" },
  { category: "system", label: "Hệ thống" },
];

export function NotificationCenter() {
  const session = useAuthSession();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const knownNotificationIdsRef = useRef(new Set<string>());
  const [isOpen, setIsOpen] = useState(false);
  const [notificationPage, setNotificationPage] = useState<NotificationPage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isPreferencesLoading, setIsPreferencesLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) return;

    let isMounted = true;
    notificationService
      .unreadCount()
      .then(({ unreadCount: nextUnreadCount }) => {
        if (isMounted) setUnreadCount(nextUnreadCount);
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (!isOpen) return;

    panelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  useNotificationStream(session?.accessToken, {
    onNotification: (notification) => {
      if (knownNotificationIdsRef.current.has(notification.id)) return;

      knownNotificationIdsRef.current.add(notification.id);
      setNotificationPage((current) => prependNotification(current, notification));
      if (!notification.isRead) setUnreadCount((current) => current + 1);
    },
    onPoll: () => {
      void refreshUnreadCount();
      if (isOpen) void loadPage(1);
    },
  });

  if (!session?.accessToken) return null;

  async function loadPage(page: number) {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const nextPage = await notificationService.list({ page, pageSize });
      knownNotificationIdsRef.current = new Set(nextPage.items.map((item) => item.id));
      setNotificationPage(nextPage);
    } catch {
      setErrorMessage("Không thể tải thông báo. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshUnreadCount() {
    try {
      const { unreadCount: nextUnreadCount } = await notificationService.unreadCount();
      setUnreadCount(nextUnreadCount);
    } catch {
      // A failed stream fallback must not interfere with normal notification APIs.
    }
  }

  function toggleCenter() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    if (!notificationPage) void loadPage(1);
  }

  async function togglePreferences() {
    const nextOpen = !isPreferencesOpen;
    setIsPreferencesOpen(nextOpen);
    if (!nextOpen || preferences) return;

    setIsPreferencesLoading(true);
    setErrorMessage(null);
    try {
      setPreferences(await notificationService.getPreferences());
    } catch {
      setErrorMessage("Không thể tải tùy chọn email. Vui lòng thử lại.");
      setIsPreferencesOpen(false);
    } finally {
      setIsPreferencesLoading(false);
    }
  }

  async function toggleEmailPreference(category: NotificationCategory) {
    const current = preferences?.find(
      (preference) => preference.channel === "email" && preference.category === category,
    );
    if (!current || isUpdating) return;

    const nextPreference = { ...current, isEnabled: !current.isEnabled };
    const previousPreferences = preferences;
    setIsUpdating(true);
    setPreferences((items) => replacePreference(items, nextPreference));

    try {
      const updated = await notificationService.setPreference(nextPreference);
      setPreferences((items) => replacePreference(items, updated));
    } catch {
      setPreferences(previousPreferences);
      setErrorMessage("Không thể cập nhật tùy chọn email. Vui lòng thử lại.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function markNotificationAsRead(notification: InAppNotification) {
    if (notification.isRead || isUpdating) return true;

    const previousPage = notificationPage;
    const previousUnreadCount = unreadCount;
    setIsUpdating(true);
    setNotificationPage((current) => updateReadState(current, notification.id, true));
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      const updated = await notificationService.markAsRead(notification.id);
      setNotificationPage((current) => replaceNotification(current, updated));
      return true;
    } catch {
      setNotificationPage(previousPage);
      setUnreadCount(previousUnreadCount);
      setErrorMessage("Không thể cập nhật thông báo. Vui lòng thử lại.");
      return false;
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleNotificationClick(notification: InAppNotification) {
    const wasMarked = await markNotificationAsRead(notification);
    const destination = getNotificationDestination(notification.link);

    if (wasMarked && destination) {
      setIsOpen(false);
      navigate(destination);
    }
  }

  async function markAllAsRead() {
    if (!notificationPage || unreadCount === 0 || isUpdating) return;

    const previousPage = notificationPage;
    const previousUnreadCount = unreadCount;
    setIsUpdating(true);
    setNotificationPage((current) => markAllRead(current));
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead();
    } catch {
      setNotificationPage(previousPage);
      setUnreadCount(previousUnreadCount);
      setErrorMessage("Không thể cập nhật thông báo. Vui lòng thử lại.");
    } finally {
      setIsUpdating(false);
    }
  }

  const currentPage = notificationPage?.page ?? 1;
  const totalPages = notificationPage?.totalPages ?? 1;

  return (
    <div className="notification-center">
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Thông báo"
        className="notification-center__trigger"
        onClick={toggleCenter}
        type="button"
      >
        <Bell aria-hidden="true" />
        {unreadCount > 0 ? <span className="notification-center__badge">{unreadCount}</span> : null}
      </button>

      {isOpen ? (
        <div
          aria-label="Thông báo"
          aria-modal="false"
          className="notification-center__panel"
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
          ref={panelRef}
          role="dialog"
          tabIndex={-1}
        >
          <header className="notification-center__header">
            <div>
              <h2>Thông báo</h2>
              <p>{unreadCount > 0 ? `${unreadCount} chưa đọc` : "Bạn đã đọc hết"}</p>
            </div>
            <div className="notification-center__header-actions">
              <button
                className="notification-center__mark-all"
                disabled={unreadCount === 0 || isUpdating}
                onClick={() => void markAllAsRead()}
                type="button"
              >
                <CheckCheck aria-hidden="true" />
                Đánh dấu đã đọc
              </button>
              <button
                aria-expanded={isPreferencesOpen}
                aria-label="Email preferences"
                className="notification-center__preferences-trigger"
                onClick={() => void togglePreferences()}
                type="button"
              >
                <Settings aria-hidden="true" />
                Tùy chọn email
              </button>
            </div>
          </header>

          {errorMessage ? <p className="notification-center__error" role="alert">{errorMessage}</p> : null}
          {isPreferencesOpen ? (
            <section aria-label="Tùy chọn email" className="notification-center__preferences">
              <p>Chỉ nhận email cho các loại thông báo bạn chọn.</p>
              {isPreferencesLoading ? <LoadingState /> : null}
              {!isPreferencesLoading && preferences ? (
                <ul>
                  {emailCategories.map(({ category, label }) => {
                    const preference = preferences.find(
                      (item) => item.channel === "email" && item.category === category,
                    );
                    const isEnabled = preference?.isEnabled ?? false;
                    return (
                      <li key={category}>
                        <button
                          aria-label={`${label} email`}
                          aria-pressed={isEnabled}
                          className="notification-center__preference-toggle"
                          disabled={!preference || isUpdating}
                          onClick={() => void toggleEmailPreference(category)}
                          type="button"
                        >
                          <span>{label}</span>
                          <span>{isEnabled ? "Bật" : "Tắt"}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          ) : null}
          {isLoading ? <LoadingState /> : null}
          {!isLoading && notificationPage?.items.length === 0 ? <EmptyState /> : null}
          {!isLoading && notificationPage ? (
            <ul className="notification-center__list">
              {notificationPage.items.map((notification) => (
                <li key={notification.id}>
                  <button
                    aria-label={notification.title}
                    className={notification.isRead ? "notification-center__item" : "notification-center__item notification-center__item--unread"}
                    data-read={String(notification.isRead)}
                    disabled={isUpdating}
                    onClick={() => void handleNotificationClick(notification)}
                    type="button"
                  >
                    <span className="notification-center__item-title">{notification.title}</span>
                    <span className="notification-center__item-body">{notification.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {notificationPage && totalPages > 1 ? (
            <nav aria-label="Trang thông báo" className="notification-center__pagination">
              <button
                aria-label="Trang trước"
                disabled={isLoading || currentPage === 1}
                onClick={() => void loadPage(currentPage - 1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button
                aria-label="Trang sau"
                disabled={isLoading || currentPage === totalPages}
                onClick={() => void loadPage(currentPage + 1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function LoadingState() {
  return (
    <p aria-busy="true" className="notification-center__state" role="status">
      <LoaderCircle aria-hidden="true" /> Đang tải thông báo…
    </p>
  );
}

function EmptyState() {
  return <p className="notification-center__state" role="status">Chưa có thông báo mới.</p>;
}

function updateReadState(
  page: NotificationPage | null,
  notificationId: string,
  isRead: boolean,
): NotificationPage | null {
  if (!page) return null;
  return {
    ...page,
    items: page.items.map((item) => (item.id === notificationId ? { ...item, isRead } : item)),
  };
}

function replaceNotification(
  page: NotificationPage | null,
  notification: InAppNotification,
): NotificationPage | null {
  if (!page) return null;
  return {
    ...page,
    items: page.items.map((item) => (item.id === notification.id ? notification : item)),
  };
}

function prependNotification(
  page: NotificationPage | null,
  notification: InAppNotification,
): NotificationPage | null {
  if (!page || page.page !== 1 || page.items.some((item) => item.id === notification.id)) {
    return page;
  }

  const total = page.total + 1;
  return {
    ...page,
    items: [notification, ...page.items].slice(0, page.pageSize),
    total,
    totalPages: Math.ceil(total / page.pageSize),
  };
}

function markAllRead(page: NotificationPage | null): NotificationPage | null {
  if (!page) return null;
  return { ...page, items: page.items.map((item) => ({ ...item, isRead: true })) };
}

function replacePreference(
  preferences: NotificationPreference[] | null,
  updated: NotificationPreference,
): NotificationPreference[] | null {
  if (!preferences) return null;
  return preferences.map((item) =>
    item.channel === updated.channel && item.category === updated.category ? updated : item,
  );
}
