import { translateSystemMessage, currentSystemLocale } from "../features/platform/translate-system-message";
import { getAuthSession } from './auth.service';
import { ApiClient, ApiClientError } from './api-client';

export type GdsWalletState =
  | 'UNAVAILABLE'
  | 'NOT_INITIALIZED'
  | 'SUSPENDED'
  | 'READY_SANDBOX'
  | 'READY_PRODUCTION'
  | 'RECONCILIATION_REQUIRED';

export interface GdsActiveTopup {
  topupId: string;
  amountMinor: string;
  currency: 'VND';
  status: 'AWAITING_TRANSFER' | 'RECONCILING' | 'CREDITED' | 'REVIEW' | 'EXPIRED' | 'CANCELLED';
  gdsCredited: boolean;
  creditedAt: string | null;
}

export interface GdsWalletSummary {
  paymentHeldMinor?: string;
  withdrawalHeldMinor?: string;
  totalWithdrawnMinor?: string;
  totalDepositedMinor?: string;
  totalPaidMinor?: string;
  income?: null | {
    status: 'READY' | 'UNAVAILABLE';
    totalMinor: string | null;
    recognizedMinor: string | null;
    pendingMinor: string | null;
    reviewPendingMinor: string | null;
  };
  withdrawalEnabled?: boolean;
  withdrawalMinimumMinor?: string;
  withdrawalMaximumMinor?: string;
  debtMinor?: string;
  activeTopup?: GdsActiveTopup | null;
  available: boolean;
  mode: 'disabled' | 'sandbox' | 'production';
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
    type: 'TOPUP_CREDIT' | 'RESERVE' | 'CAPTURE' | 'RELEASE' | 'WITHDRAWAL_RESERVE' | 'WITHDRAWAL_RELEASE' | 'WITHDRAWAL_PAID' | 'REVENUE_CREDIT' | 'REVENUE_REVERSAL';
    amountMinor: string;
    occurredAt: string;
    withdrawalId?: string;
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

export interface GdsWalletCheckoutReceipt {
  orderId: string;
  status: 'CONFIRMED';
  amountMinor: string;
  currency: 'VND';
}

const authenticatedClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export type GdsActivityFilter = 'all' | 'incoming' | 'outgoing' | 'payments' | 'withdrawals';
export interface GdsActivityItem {
  id: string; type: NonNullable<GdsWalletSummary['recentTransactions']>[number]['type'] | 'WITHDRAWAL';
  amountMinor: string; occurredAt: string; withdrawalId?: string; status?: import('./gds-withdrawal.service').Withdrawal['status'];
  bankCode?: string; bankShortName?: string; accountNumber?: string;
}
export interface GdsActivityPage { items: GdsActivityItem[]; nextCursor: string | null; hasMore: boolean }

export const gdsWalletService = {
  transactions: (filter: GdsActivityFilter = 'all', cursor?: string): Promise<GdsActivityPage> => authenticatedClient.get(
    '/wallet/gds/transactions?' + new URLSearchParams({ filter, limit: '20', ...(cursor ? {cursor} : {}) }).toString(),
  ),
  summary: (topupId?: string): Promise<GdsWalletSummary> => authenticatedClient.get(
    '/wallet/gds' + (topupId ? '?topupId=' + encodeURIComponent(topupId) : ''),
  ),
  cancelPayosTopup: (topupId: string): Promise<{ topupId: string; status: 'CANCELLED'; gdsCredited: false }> =>
    authenticatedClient.post('/wallet/gds/topups/' + encodeURIComponent(topupId) + '/cancel', {}),
  createPayosQr: (amountMinor: string, idempotencyKey: string): Promise<GdsPayosTopupQr> =>
    authenticatedClient.post('/wallet/gds/topups/payos', { amountMinor }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  async payOrder(orderId: string): Promise<GdsWalletCheckoutReceipt> {
    const receipt = await authenticatedClient.post<GdsWalletCheckoutReceipt>(
      `/wallet/gds/orders/${encodeURIComponent(orderId)}/pay`,
    );
    if (receipt.orderId !== orderId || receipt.status !== 'CONFIRMED' ||
        receipt.currency !== 'VND' || !/^[1-9]\d*$/.test(receipt.amountMinor)) {
      throw new Error('GDS payment receipt is not confirmed by the system');
    }
    return receipt;
  },
};

/** The server sends integer VND as strings; never convert a ledger balance to Number. */
export function formatGdsVnd(amount: string | null | undefined): string {
  if (typeof amount !== 'string' || !/^(0|[1-9]\d{0,29})$/.test(amount)) return '—';
  try {
    return `${new Intl.NumberFormat(currentSystemLocale()).format(BigInt(amount))} ₫`;
  } catch {
    return '—';
  }
}

export function getGdsWalletError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 404) return translateSystemMessage("Hệ thống chưa cung cấp số dư Ví GDS cho tài khoản này.");
    if (error.status === 403) return translateSystemMessage("Tài khoản này không có quyền truy cập Ví GDS.");
    return translateSystemMessage("Không thể kiểm tra số dư Ví GDS lúc này. Vui lòng thử lại sau.");
  }
  return translateSystemMessage("Không thể kết nối để kiểm tra Ví GDS. Vui lòng thử lại sau.");
}

export function getGdsPayosQrError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 403 || error.status === 404 || error.status === 503) {
      return translateSystemMessage("Tính năng tạo mã QR nạp ví chưa được mở trên hệ thống này.");
    }
    if (error.status === 409) return translateSystemMessage("Yêu cầu nạp chưa được xử lý. Vui lòng kiểm tra lại số tiền hoặc liên hệ hỗ trợ.");
  }
  return translateSystemMessage("Chưa tạo được mã QR. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.");
}

export function getGdsCheckoutError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 403 || error.status === 404 || error.status === 503) {
      return translateSystemMessage("Thanh toán bằng GDS chưa được mở trên hệ thống này.");
    }
    if (error.code === 'GDS_CAPTURE_INSUFFICIENT_FUNDS') return translateSystemMessage("Ví GDS không đủ số dư để thanh toán đơn này.");
    if (error.status === 409) return translateSystemMessage("Đơn hàng đã có phương thức thanh toán khác hoặc chưa đủ điều kiện dùng GDS.");
  }
  return translateSystemMessage("Hệ thống chưa hoàn tất được thanh toán GDS. Vui lòng kiểm tra lại trạng thái đơn trước khi thử tiếp.");
}

/** The API supplies capabilities; a build-time UAT switch cannot authorize money. */
export function hasTrustedGdsBalance(wallet: GdsWalletSummary | null | undefined): wallet is GdsWalletSummary & { balance: NonNullable<GdsWalletSummary['balance']> } {
  return wallet?.available === true && wallet.balance?.currency === 'VND' &&
    ((wallet.mode === 'production' && wallet.state === 'READY_PRODUCTION') ||
      (wallet.mode === 'sandbox' && wallet.state === 'READY_SANDBOX'));
}
