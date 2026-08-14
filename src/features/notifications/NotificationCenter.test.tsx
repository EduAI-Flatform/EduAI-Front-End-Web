import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
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
