import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TmiRewardsPage } from "./TmiRewardsPage";
import { tmiService } from "../../../../services/tmi.service";

vi.mock("../../../../services/tmi.service", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../../../services/tmi.service")>();
  return { ...original, tmiService: { listRewards: vi.fn(), wallet: vi.fn(), history: vi.fn(), redeem: vi.fn() } };
});

const listRewardsMock = vi.mocked(tmiService.listRewards);
const walletMock = vi.mocked(tmiService.wallet);
const historyMock = vi.mocked(tmiService.history);
const redeemMock = vi.mocked(tmiService.redeem);

const emptyWallet = { current: 0, earned: 0, spent: 0, expired: 0 };

describe("TmiRewardsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRewardsMock.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    walletMock.mockResolvedValue(emptyWallet);
    historyMock.mockResolvedValue([]);
  });

  it("shows a meaningful empty catalog and server wallet", async () => {
    render(<TmiRewardsPage />);

    expect(await screen.findByRole("heading", { name: "Đổi thưởng TMI" })).toBeInTheDocument();
    expect(screen.getByText("Chưa có phần thưởng khả dụng.")).toBeInTheDocument();
    expect(screen.getAllByText("0 TMI", { selector: ".tmi-rewards__balance-value" })).toHaveLength(4);
  });

  it("requires confirmation before redeeming and shows the server result", async () => {
    listRewardsMock.mockResolvedValue({
      items: [{ id: "reward-1", title: "E-book", description: "Tài liệu học tập", kind: "digital", cost: 40, status: "active", quota: null, redeemedCount: 0, startsAt: "2026-08-01T00:00:00.000Z", endsAt: "2026-09-01T00:00:00.000Z", inventoryMetadata: null, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    walletMock.mockResolvedValue({ current: 100, earned: 100, spent: 0, expired: 0 });
    redeemMock.mockResolvedValue({ id: "redemption-1", userId: "student-1", rewardId: "reward-1", idempotencyKey: "request-123456", cost: 40, createdAt: "2026-08-18T00:00:00.000Z", idempotent: false });
    const user = userEvent.setup();

    render(<TmiRewardsPage />);
    await user.click(await screen.findByRole("button", { name: "Đổi E-book" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Xác nhận đổi thưởng");
    expect(redeemMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Xác nhận đổi" }));
    expect(redeemMock).toHaveBeenCalledWith("reward-1", expect.any(String));
    expect(await screen.findByRole("status")).toHaveTextContent("Đổi thưởng thành công");
  });
});
