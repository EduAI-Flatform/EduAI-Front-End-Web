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

export interface GdsPayosTopupQr {
  topupId: string;
  amountMinor: string;
  currency: 'VND';
  transferMemo: string;
  receivingAccount: string;
  checkoutUrl: string;
  qrCodeDataUrl: string;
  expiresAt: string;
  status: 'AWAITING_TRANSFER';
  gdsCredited: false;
}

const authenticatedClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const gdsWalletService = {
  summary: (): Promise<GdsWalletSummary> => authenticatedClient.get('/wallet/gds'),
  createPayosQr: (amountMinor: string, idempotencyKey: string): Promise<GdsPayosTopupQr> =>
    authenticatedClient.post('/wallet/gds/topups/payos', { amountMinor }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
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
    if (error.status === 404) return 'Hệ thống chưa cung cấp số dư Ví GDS cho tài khoản này.';
    if (error.status === 403) return 'Tài khoản này không có quyền truy cập Ví GDS.';
    return 'Không thể kiểm tra số dư Ví GDS lúc này. Vui lòng thử lại sau.';
  }
  return 'Không thể kết nối để kiểm tra Ví GDS. Vui lòng thử lại sau.';
}

export function getGdsPayosQrError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 403 || error.status === 404 || error.status === 503) {
      return 'Tính năng tạo mã QR nạp ví chưa được mở trên hệ thống này.';
    }
    if (error.status === 409) return 'Yêu cầu nạp chưa được xử lý. Vui lòng kiểm tra lại số tiền hoặc liên hệ hỗ trợ.';
  }
  return 'Chưa tạo được mã QR PayOS. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.';
}
