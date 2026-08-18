import { ApiClientError, ApiClient } from "./api-client";
import { getAuthSession } from "./auth.service";

export type TmiRewardKind = "course_access" | "voucher" | "gift" | (string & {});

export interface TmiReward {
  id: string;
  title: string;
  description: string | null;
  kind: TmiRewardKind;
  cost: number;
  status: string;
  quota: number | null;
  redeemedCount: number;
  startsAt: string;
  endsAt: string;
  inventoryMetadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
}

export interface TmiRewardPage {
  items: TmiReward[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TmiWallet {
  current: number;
  earned: number;
  spent: number;
  expired: number;
}

export interface TmiLedgerEntry {
  id: string;
  kind: string;
  amount: number;
  adjustmentDirection: string | null;
  sourceType: string;
  occurredAt: string;
}

export interface TmiRedemption {
  id: string;
  userId: string;
  rewardId: string;
  idempotencyKey: string;
  cost: number;
  createdAt: string;
  idempotent: boolean;
}

export type TmiRewardStatus = "draft" | "active" | "disabled" | "expired";

export interface TmiRewardMutationInput {
  title: string;
  description?: string | null;
  kind: TmiRewardKind;
  cost: number;
  startsAt: string;
  endsAt: string;
  quota?: number | null;
  status?: TmiRewardStatus;
  inventoryMetadata?: Record<string, unknown> | null;
}

export interface TmiAdminRedemption {
  id: string;
  userId: string;
  rewardId: string;
  cost: number;
  createdAt: string;
  reward: { title: string; kind: TmiRewardKind };
}

export interface TmiAdminLedgerEntry {
  id: string;
  userId: string;
  kind: string;
  amount: number;
  adjustmentDirection: string | null;
  sourceType: string;
  occurredAt: string;
}

export interface TmiAdminRedemptionPage {
  items: TmiAdminRedemption[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TmiAdminLedgerPage {
  items: TmiAdminLedgerEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TmiAdjustmentInput {
  userId: string;
  amount: number;
  direction: "credit" | "debit";
  adjustmentKey: string;
  reason: string;
}

export interface TmiAdjustmentResponse {
  userId: string;
  amount: number;
  direction: "credit" | "debit";
  balance: number;
  idempotent: boolean;
}

export interface TmiRefundResponse {
  redemptionId: string;
  amount: number;
  idempotent: boolean;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const tmiService = {
  listRewards(page = 1, pageSize = 20): Promise<TmiRewardPage> {
    return authenticatedApiClient.get<TmiRewardPage>(
      `/tmi/rewards?page=${page}&pageSize=${pageSize}`,
    );
  },

  wallet(): Promise<TmiWallet> {
    return authenticatedApiClient.get<TmiWallet>("/tmi/wallet");
  },

  history(): Promise<TmiLedgerEntry[]> {
    return authenticatedApiClient.get<TmiLedgerEntry[]>("/tmi/history");
  },

  redeem(rewardId: string, idempotencyKey: string): Promise<TmiRedemption> {
    return authenticatedApiClient.post<TmiRedemption>(
      `/tmi/rewards/${rewardId}/redemptions`,
      { idempotencyKey },
    );
  },
};

export const adminTmiService = {
  listRewards(page = 1, pageSize = 20): Promise<TmiRewardPage> {
    return authenticatedApiClient.get<TmiRewardPage>(
      `/admin/tmi/rewards?page=${page}&pageSize=${pageSize}`,
    );
  },

  getReward(id: string): Promise<TmiReward> {
    return authenticatedApiClient.get<TmiReward>(`/admin/tmi/rewards/${id}`);
  },

  createReward(input: TmiRewardMutationInput): Promise<TmiReward> {
    return authenticatedApiClient.post<TmiReward>("/admin/tmi/rewards", { ...input });
  },

  updateReward(id: string, input: Partial<TmiRewardMutationInput>): Promise<TmiReward> {
    return authenticatedApiClient.patch<TmiReward>(`/admin/tmi/rewards/${id}`, input);
  },

  listRedemptions(page = 1, pageSize = 20, userId?: string, rewardId?: string): Promise<TmiAdminRedemptionPage> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (userId) params.set("userId", userId);
    if (rewardId) params.set("rewardId", rewardId);
    return authenticatedApiClient.get<TmiAdminRedemptionPage>(`/admin/tmi/redemptions?${params.toString()}`);
  },

  listLedger(page = 1, pageSize = 20, userId?: string): Promise<TmiAdminLedgerPage> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (userId) params.set("userId", userId);
    return authenticatedApiClient.get<TmiAdminLedgerPage>(`/admin/tmi/ledger?${params.toString()}`);
  },

  adjustBalance(input: TmiAdjustmentInput): Promise<TmiAdjustmentResponse> {
    return authenticatedApiClient.post<TmiAdjustmentResponse>("/admin/tmi/adjustments", { ...input });
  },

  refund(redemptionId: string, input: { reason?: string }): Promise<TmiRefundResponse> {
    return authenticatedApiClient.post<TmiRefundResponse>(`/admin/tmi/redemptions/${redemptionId}/refund`, input);
  },
};

export function getTmiErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return "Không thể tải dữ liệu TMI. Vui lòng thử lại.";
}
