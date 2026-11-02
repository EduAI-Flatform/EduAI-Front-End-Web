import { getAuthSession } from './auth.service';
import { ApiClient, ApiClientError } from './api-client';

export type GdsWalletState =
  | 'UNAVAILABLE'
  | 'NOT_INITIALIZED'
  | 'SUSPENDED'
  | 'READY_SANDBOX'
  | 'RECONCILIATION_REQUIRED';

export interface GdsWalletSummary {
  available: boolean;
  mode: 'disabled' | 'sandbox';
  state: GdsWalletState;
  balance: null | {
    settledMinor: string;
    reservedMinor: string;
    availableMinor: string;
    currency: 'VND';
  };
  paymentEnabled: boolean;
  topupEnabled: boolean;
  /** Optional while production backend still runs the older read-only contract. */
  recentTransactions?: Array<{
    id: string;
    type: 'TOPUP_CREDIT' | 'RESERVE' | 'CAPTURE' | 'RELEASE';
    amountMinor: string;
    occurredAt: string;
  }>;
}

const authenticatedClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const gdsWalletService = {
  summary: (): Promise<GdsWalletSummary> => authenticatedClient.get('/wallet/gds'),
};

/** The server sends integer VND as strings; never convert a ledger balance to Number. */
export function formatGdsVnd(amount: string | null | undefined): string {
  if (typeof amount !== 'string' || !/^(0|[1-9]\d{0,29})$/.test(amount)) return '—';
  try {
    return `${new Intl.NumberFormat('vi-VN').format(BigInt(amount))} ₫`;
  } catch {
    return '—';
  }
}

export function getGdsWalletError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 404) return 'Máy chủ chưa cung cấp Ví GDS. Vui lòng thử lại khi tính năng được phát hành.';
    if (error.status === 403) return 'Tài khoản này không có quyền truy cập Ví GDS.';
    return 'Không thể kiểm tra số dư Ví GDS lúc này. Vui lòng thử lại sau.';
  }
  return 'Không thể kết nối để kiểm tra Ví GDS. Vui lòng thử lại sau.';
}
