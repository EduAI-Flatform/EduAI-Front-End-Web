import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AdminModerationDetail,
  AdminModerationItem,
  AdminModerationPage as ModerationPage,
} from "../../../services/admin-moderation.service";
import { AdminModerationPage } from "./AdminModerationPage";

const moderationApi = vi.hoisted(() => ({
  get: vi.fn(),
  list: vi.fn(),
  moderate: vi.fn(),
}));

vi.mock("../../../services/admin-moderation.service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../../services/admin-moderation.service")
  >();
  return { ...actual, adminModerationService: moderationApi };
});

const item: AdminModerationItem = {
  id: "11111111-1111-4111-8111-111111111111",
  targetType: "course",
  title: "Review target",
  content: "A course description for review.",
  owner: {
    id: "22222222-2222-4222-8222-222222222222",
    fullName: "Course Owner",
  },
  moderationStatus: "clear",
  moderationReason: null,
  moderatedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
};

const secondItem: AdminModerationItem = {
  ...item,
  id: "33333333-3333-4333-8333-333333333333",
  title: "Second review target",
};

const page: ModerationPage = {
  items: [item],
  page: 1,
  pageSize: 25,
  total: 1,
  totalPages: 1,
};

const detail: AdminModerationDetail = {
  item,
  history: [
    {
      id: "audit-id",
      actorId: "admin-id",
      action: "CONTENT_MODERATION_CHANGED",
      targetType: "course",
      targetId: item.id,
      metadataJson: {
        action: "restore",
        previousStatus: "hidden",
        newStatus: "clear",
        reason: "Review completed",
      },
      occurredAt: "2026-08-03T00:00:00.000Z",
      actor: {
        id: "admin-id",
        email: "admin@example.com",
        fullName: "Platform Admin",
      },
    },
  ],
};

describe("AdminModerationPage", () => {
  beforeEach(() => {
    Object.values(moderationApi).forEach((mock) => mock.mockReset());
    moderationApi.list.mockResolvedValue(page);
    moderationApi.get.mockResolvedValue(detail);
    moderationApi.moderate.mockResolvedValue({
      ...item,
      moderationStatus: "rejected",
      moderationReason: "Confirmed policy violation",
    });
  });

  it("renders the live queue and applies target, status, and search filters", async () => {
    const user = userEvent.setup();
    render(<AdminModerationPage />);

    expect(
      await screen.findByRole("heading", { name: "Kiểm duyệt nội dung" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Review target")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Loại nội dung"), "community_post");
    await user.selectOptions(screen.getByLabelText("Trạng thái kiểm duyệt"), "hidden");
    await user.type(screen.getByLabelText("Tìm nội dung"), "policy");
    await user.click(screen.getByRole("button", { name: "Áp dụng bộ lọc" }));

    await waitFor(() => {
      expect(moderationApi.list).toHaveBeenLastCalledWith({
        targetType: "community_post",
        status: "hidden",
        search: "policy",
        page: 1,
        pageSize: 25,
      });
    });
  });

  it("loads review evidence and audit history for the selected target", async () => {
    const user = userEvent.setup();
    render(<AdminModerationPage />);

    await user.click(
      await screen.findByRole("button", { name: "Xem Review target" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Review target" }),
    ).toBeInTheDocument();
    expect(screen.getByText("A course description for review.")).toBeInTheDocument();
    expect(screen.getByText("Review completed")).toBeInTheDocument();
    expect(moderationApi.get).toHaveBeenCalledWith("course", item.id);
  });

  it("requires a reason and confirmation before rejecting content", async () => {
    const user = userEvent.setup();
    render(<AdminModerationPage />);

    await user.click(
      await screen.findByRole("button", { name: "Xem Review target" }),
    );
    await screen.findByRole("heading", { name: "Review target" });
    await user.click(screen.getByRole("button", { name: "Từ chối" }));

    expect(moderationApi.moderate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Xác nhận từ chối" }),
    ).toBeInTheDocument();
    await user.type(
      screen.getByLabelText("Lý do kiểm duyệt"),
      "Confirmed policy violation",
    );
    await user.click(screen.getByRole("button", { name: "Xác nhận thay đổi" }));

    await waitFor(() => {
      expect(moderationApi.moderate).toHaveBeenCalledWith("course", item.id, {
        action: "reject",
        reason: "Confirmed policy violation",
      });
    });
  });

  it("keeps the newest target selected when detail responses arrive out of order", async () => {
    const firstRequest = deferred<AdminModerationDetail>();
    const secondRequest = deferred<AdminModerationDetail>();
    moderationApi.list.mockResolvedValue({
      ...page,
      items: [item, secondItem],
      total: 2,
    });
    moderationApi.get.mockImplementation((_type: string, targetId: string) =>
      targetId === item.id ? firstRequest.promise : secondRequest.promise,
    );
    const user = userEvent.setup();
    render(<AdminModerationPage />);

    await user.click(
      await screen.findByRole("button", { name: "Xem Review target" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Xem Second review target" }),
    );
    secondRequest.resolve({
      ...detail,
      item: secondItem,
    });
    expect(
      await screen.findByRole("heading", { name: "Second review target" }),
    ).toBeInTheDocument();

    await act(async () => {
      firstRequest.resolve(detail);
      await firstRequest.promise;
    });
    expect(
      screen.getByRole("heading", { name: "Second review target" }),
    ).toBeInTheDocument();
  });

  it("shows list failures with retry and an explicit empty state", async () => {
    moderationApi.list
      .mockRejectedValueOnce(new Error("Cannot reach moderation API"))
      .mockResolvedValueOnce({ ...page, items: [], total: 0, totalPages: 0 });
    const user = userEvent.setup();
    render(<AdminModerationPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cannot reach moderation API",
    );
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Không có nội dung phù hợp.",
    );
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });

  return { promise, resolve };
}
