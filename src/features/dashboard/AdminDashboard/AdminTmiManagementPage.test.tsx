import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminTmiManagementPage } from "./AdminTmiManagementPage";
import { adminTmiService } from "../../../services/tmi.service";

vi.mock("../../../services/tmi.service", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../../services/tmi.service")>();
  return {
    ...original,
    adminTmiService: {
      ...original.adminTmiService,
      listRewards: vi.fn(),
      listRedemptions: vi.fn(),
      listLedger: vi.fn(),
      createReward: vi.fn(),
      updateReward: vi.fn(),
      adjustBalance: vi.fn(),
      refund: vi.fn(),
    },
  };
});

const listRewardsMock = vi.mocked(adminTmiService.listRewards);
const listRedemptionsMock = vi.mocked(adminTmiService.listRedemptions);
const listLedgerMock = vi.mocked(adminTmiService.listLedger);
const createRewardMock = vi.mocked(adminTmiService.createReward);

describe("AdminTmiManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRewardsMock.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    listRedemptionsMock.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    listLedgerMock.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
  });

  it("shows empty catalog, redemption, and ledger states", async () => {
    render(<AdminTmiManagementPage />);

    expect(await screen.findByRole("heading", { name: "Quản lý TMI Rewards" })).toBeInTheDocument();
    expect(screen.getByText("Chưa có phần thưởng.")).toBeInTheDocument();
    expect(screen.getByText("Chưa có redemption.")).toBeInTheDocument();
    expect(screen.getByText("Chưa có ledger entry.")).toBeInTheDocument();
  });

  it("creates a reward using the admin form and keeps the save disabled while pending", async () => {
    createRewardMock.mockResolvedValue({ id: "reward-1", title: "E-book", description: null, kind: "gift", cost: 50, status: "draft", quota: null, redeemedCount: 0, startsAt: "2026-08-01T00:00:00.000Z", endsAt: "2026-09-01T00:00:00.000Z", inventoryMetadata: null, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" });
    const user = userEvent.setup();

    render(<AdminTmiManagementPage />);
    await screen.findByRole("heading", { name: "Quản lý TMI Rewards" });
    await user.type(screen.getByLabelText("Tiêu đề phần thưởng"), "E-book");
    await user.clear(screen.getByLabelText("Chi phí TMI"));
    await user.type(screen.getByLabelText("Chi phí TMI"), "50");
    await user.click(screen.getByRole("button", { name: "Lưu phần thưởng" }));

    expect(createRewardMock).toHaveBeenCalledWith(expect.objectContaining({ title: "E-book", cost: 50, kind: "gift" }));
  });
});
