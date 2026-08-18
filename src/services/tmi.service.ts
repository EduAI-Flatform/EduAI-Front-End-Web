import { ApiClientError, ApiClient } from "./api-client";
import { getAuthSession } from "./auth.service";

export type TmiRewardKind = "digital" | "physical" | "course_access" | string;

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

export function getTmiErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return "Không thể tải dữ liệu TMI. Vui lòng thử lại.";
}
