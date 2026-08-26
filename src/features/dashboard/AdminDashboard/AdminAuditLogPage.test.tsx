import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAuditLogPage } from "./AdminAuditLogPage";

const auditApi = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock("../../../services/admin-audit.service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../../services/admin-audit.service")
  >();

  return {
    ...actual,
    adminAuditService: { list: auditApi.list },
  };
});

const auditPage = {
  items: [
    {
      id: "audit-id",
      actorKind: "USER" as const,
      actorId: "admin-id",
      action: "COURSE_PUBLISHED",
      targetType: "course",
      targetId: "course-id",
      metadataJson: { status: "published" },
      occurredAt: "2026-08-10T08:30:00.000Z",
      actor: {
        id: "admin-id",
        email: "admin@example.com",
        fullName: "Platform Admin",
      },
    },
  ],
  page: 1,
  pageSize: 25,
  total: 1,
  totalPages: 1,
};

describe("AdminAuditLogPage", () => {
  beforeEach(() => {
    auditApi.list.mockReset();
  });

  it("renders live audit records and safe metadata", async () => {
    auditApi.list.mockResolvedValue(auditPage);

    render(<AdminAuditLogPage />);

    expect(
      await screen.findByRole("heading", { name: "Nhật ký kiểm toán" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Platform Admin")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("COURSE_PUBLISHED"),
    ).toBeInTheDocument();
    expect(screen.getByText("status: published")).toBeInTheDocument();
  });

  it("renders a provider audit record without a fake user", async () => {
    auditApi.list.mockResolvedValue({
      ...auditPage,
      items: [{
        ...auditPage.items[0],
        actorKind: "PROVIDER",
        actorId: null,
        actor: null,
        action: "PAYMENT_WEBHOOK_SETTLED",
      }],
    });

    render(<AdminAuditLogPage />);

    expect(await screen.findByText("PROVIDER")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("PAYMENT_WEBHOOK_SETTLED"),
    ).toBeInTheDocument();
  });

  it("submits search filters and resets pagination", async () => {
    auditApi.list.mockResolvedValue(auditPage);
    const user = userEvent.setup();

    render(<AdminAuditLogPage />);
    await screen.findByText("Platform Admin");

    await user.type(
      screen.getByRole("searchbox", { name: "Tìm nhật ký" }),
      "course",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Hành động" }),
      "COURSE_PUBLISHED",
    );
    await user.click(screen.getByRole("button", { name: "Áp dụng bộ lọc" }));

    expect(auditApi.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 25,
        search: "course",
        action: "COURSE_PUBLISHED",
      }),
    );
  });

  it("shows an empty state for a valid query with no records", async () => {
    auditApi.list.mockResolvedValue({ ...auditPage, items: [], total: 0 });

    render(<AdminAuditLogPage />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Không có bản ghi kiểm toán phù hợp.",
    );
  });

  it("retries after an API error", async () => {
    auditApi.list
      .mockRejectedValueOnce(new Error("Không thể tải nhật ký"))
      .mockResolvedValueOnce(auditPage);
    const user = userEvent.setup();

    render(<AdminAuditLogPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể tải nhật ký",
    );
    await user.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await screen.findByText("Platform Admin")).toBeInTheDocument();
    expect(auditApi.list).toHaveBeenCalledTimes(2);
  });
});
