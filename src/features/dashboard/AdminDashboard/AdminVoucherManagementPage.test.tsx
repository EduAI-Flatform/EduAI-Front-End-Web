import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminVoucherManagementPage } from "./AdminVoucherManagementPage";
import { adminVoucherService } from "../../../services/voucher.service";

vi.mock("../../../services/voucher.service", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../../services/voucher.service")>();
  return {
    ...original,
    adminVoucherService: {
      ...original.adminVoucherService,
      list: vi.fn(),
      redemptions: vi.fn(),
    },
  };
});

const listMock = vi.mocked(adminVoucherService.list);

describe("AdminVoucherManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
  });

  it("loads the protected voucher management surface and empty state", async () => {
    render(<AdminVoucherManagementPage />);

    expect(await screen.findByRole("heading", { name: "Quản lý voucher" })).toBeInTheDocument();
    expect(screen.getByText("Chưa có voucher.")).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith();
  });
});

it('localizes the persisted voucher status without changing its code', async () => {
 listMock.mockResolvedValue({ items: [{ id: 'v', code: 'active', status: 'disabled', kind: 'fixed', value: 100, currency: 'VND', courseIds: [], categorySlugs: [], eligibleUserIds: [] }], total: 1, totalPages: 1, page: 1, pageSize: 20 } as never);
 render(<AdminVoucherManagementPage />);
 expect(await screen.findByText('Đã tắt', { selector: 'em' })).toBeInTheDocument();
 expect(screen.getByText('active', { selector: 'strong' })).toBeInTheDocument();
});
