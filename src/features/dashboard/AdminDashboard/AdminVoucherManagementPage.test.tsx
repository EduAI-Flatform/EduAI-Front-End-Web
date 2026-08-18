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
