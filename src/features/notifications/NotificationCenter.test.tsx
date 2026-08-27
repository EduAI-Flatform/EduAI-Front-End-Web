import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InAppNotification } from "../../services/notification.service";
import { NotificationCenter } from "./NotificationCenter";

const service = vi.hoisted(() => ({
  getPreferences: vi.fn(),
  list: vi.fn(),
  markAllAsRead: vi.fn(),
  markAsRead: vi.fn(),
  setPreference: vi.fn(),
  unreadCount: vi.fn(),
}));
const stream = vi.hoisted(() => ({ useNotificationStream: vi.fn() }));

vi.mock("../../services/notification.service", () => ({
  notificationService: service,
}));

vi.mock("../auth/auth-store", () => ({
  useAuthSession: () => ({ accessToken: "access-token" }),
}));

vi.mock("./use-notification-stream", () => stream);

const unreadNotification: InAppNotification = {
  body: "Your course has a new update.",
  category: "system",
  createdAt: "2026-08-13T00:00:00.000Z",
  id: "13aa8a9b-8fe5-4ec0-9ac8-b6f2a2ad29aa",
  isRead: false,
  link: null,
  readAt: null,
  title: "Course update",
  type: "course_updated",
};

describe("NotificationCenter", () => {
  it("uses a safe-area bottom sheet on mobile", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "src/features/notifications/NotificationCenter.css"),
      "utf8",
    );

    expect(styles).toMatch(/@media\s*\(max-width:\s*576px\)[\s\S]*\.notification-center__panel\s*\{[^}]*position:\s*fixed/s);
    expect(styles).toContain("env(safe-area-inset-bottom)");
    const mobileStyles = styles.slice(styles.indexOf("@media (max-width: 576px)"));
    const standaloneRuleStart = mobileStyles.indexOf(".notification-center--standalone {");
    const standaloneRuleEnd = mobileStyles.indexOf("}", standaloneRuleStart);
    expect(mobileStyles.slice(standaloneRuleStart, standaloneRuleEnd)).toContain(
      "position: relative;",
    );
    const headerPanelRuleStart = mobileStyles.indexOf(
      ".notification-center--header .notification-center__panel {",
    );
    const headerPanelRuleEnd = mobileStyles.indexOf("}", headerPanelRuleStart);
    expect(mobileStyles.slice(headerPanelRuleStart, headerPanelRuleEnd)).toContain(
      "position: absolute;",
    );
    expect(mobileStyles.slice(headerPanelRuleStart, headerPanelRuleEnd)).toContain(
      "top: calc(100% + 0.5rem);",
    );
    expect(styles).toContain("border-radius: 1rem 1rem 0 0");
  });

  beforeEach(() => {
    service.unreadCount.mockResolvedValue({ unreadCount: 1 });
    service.list.mockResolvedValue({
      items: [unreadNotification],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    });
    service.markAllAsRead.mockResolvedValue({ updatedCount: 1 });
    service.markAsRead.mockResolvedValue({ ...unreadNotification, isRead: true });
    service.getPreferences.mockResolvedValue([
      { category: "assignment", channel: "email", isEnabled: false },
      { category: "grade", channel: "email", isEnabled: false },
      { category: "classroom", channel: "email", isEnabled: true },
      { category: "certificate", channel: "email", isEnabled: false },
      { category: "system", channel: "email", isEnabled: false },
    ]);
    service.setPreference.mockResolvedValue({
      category: "assignment",
      channel: "email",
      isEnabled: true,
    });
  });

  it("opens a labelled notification center with a bounded API-backed list", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    const bell = await screen.findByRole("button", { name: /thông báo/i });
    expect(bell).toHaveTextContent("1");

    await user.click(bell);

    expect(await screen.findByRole("heading", { name: /thông báo/i })).toBeVisible();
    expect(screen.getByText("Course update")).toBeVisible();
    expect(screen.getByText("Your course has a new update.")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Course update" })).not.toBeInTheDocument();
    expect(service.list).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
  });

  it("links the bell to its notification panel for assistive technology", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    const bell = await screen.findByRole("button", { name: /thông báo/i });
    const panelId = bell.getAttribute("aria-controls");

    expect(panelId).toMatch(/^notification-center-panel/);

    await user.click(bell);

    expect(await screen.findByRole("dialog", { name: /thông báo/i })).toHaveAttribute(
      "id",
      panelId,
    );
  });

  it("closes when the user clicks outside the notification center", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NotificationCenter />
        <button type="button">Outside</button>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /thông báo/i }));
    expect(await screen.findByRole("dialog", { name: /thông báo/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Outside" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /thông báo/i })).not.toBeInTheDocument();
    });
  });

  it("closes when the route changes while the panel is open", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <RouteChangeProbe />
        <NotificationCenter />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /thông báo/i }));
    expect(await screen.findByRole("dialog", { name: /thông báo/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Navigate" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /thông báo/i })).not.toBeInTheDocument();
    });
  });

  it("keeps the unread badge compact when the count is large", async () => {
    const user = userEvent.setup();
    service.unreadCount.mockResolvedValueOnce({ unreadCount: 125 });
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    const bell = await screen.findByRole("button", { name: /thông báo/i });

    expect(bell).toHaveTextContent("99+");

    await user.click(bell);
    expect(await screen.findByRole("dialog", { name: /thông báo/i })).toBeVisible();
  });

  it("keeps focus on the bell when opening the dropdown", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    const bell = await screen.findByRole("button", { name: /thông báo/i });
    await user.click(bell);

    expect(await screen.findByRole("dialog", { name: /thông báo/i })).toBeVisible();
    expect(bell).toHaveFocus();
  });

  it("rolls an optimistic read state back when the API rejects it", async () => {
    const user = userEvent.setup();
    service.markAsRead.mockRejectedValueOnce(new Error("network unavailable"));

    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /thông báo/i }));
    const notification = await screen.findByRole("button", { name: /course update/i });

    await user.click(notification);

    await waitFor(() => {
      expect(notification).toHaveAttribute("data-read", "false");
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/không thể cập nhật/i);
  });

  it("marks a linked notification as read before navigating to its destination", async () => {
    const user = userEvent.setup();
    service.list.mockResolvedValueOnce({
      items: [{ ...unreadNotification, link: "/courses/example-course" }],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <LocationProbe />
        <NotificationCenter />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /thông báo/i }));
    await user.click(await screen.findByRole("button", { name: /course update/i }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/courses/example-course");
    });
    expect(screen.queryByRole("dialog", { name: /thông báo/i })).not.toBeInTheDocument();
    expect(service.markAsRead).toHaveBeenCalledWith(unreadNotification.id);
  });

  it("opens and closes from the keyboard", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    const bell = await screen.findByRole("button", { name: /thông báo/i });
    bell.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: /thông báo/i })).toBeVisible();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /thông báo/i })).not.toBeInTheDocument();
    });
  });

  it("lets users opt into email delivery for an optional category", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /thông báo/i }));
    await user.click(await screen.findByRole("button", { name: /email preferences/i }));
    const assignmentToggle = await screen.findByRole("button", { name: /bài tập email/i });

    expect(assignmentToggle).toHaveAttribute("aria-pressed", "false");
    await user.click(assignmentToggle);

    await waitFor(() => {
      expect(service.setPreference).toHaveBeenCalledWith({
        category: "assignment",
        channel: "email",
        isEnabled: true,
      });
    });
    expect(assignmentToggle).toHaveAttribute("aria-pressed", "true");
  });

  it("does not add a duplicate visible notification after stream replay", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button"));
    await screen.findByText("Course update");
    const options = stream.useNotificationStream.mock.calls.at(-1)?.[1] as {
      onNotification: (notification: InAppNotification) => void;
    };

    await act(async () => {
      options.onNotification(unreadNotification);
      options.onNotification(unreadNotification);
    });

    expect(screen.getAllByText("Course update")).toHaveLength(1);
  });
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function RouteChangeProbe() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate("/courses")} type="button">
      Navigate
    </button>
  );
}
