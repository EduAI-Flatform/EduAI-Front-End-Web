import { ApiClient, ApiClientError } from './api-client';
import { getAuthSession } from './auth.service';
import type { MoneyValue } from './commerce.service';

export interface PaymentCheckoutState {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  paymentRequired: boolean;
  payment: {
    id: string;
    status: string;
    amount: MoneyValue;
    expiresAt: string;
    checkoutUrl?: string;
    qrCodeDataUrl?: string;
  } | null;
}

export interface PendingPaymentPage {
  items: PaymentCheckoutState[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface CachedCheckoutArtifact {
  orderId: string;
  paymentId: string;
  expiresAt: string;
  checkoutUrl?: string;
  qrCodeDataUrl: string;
}

const TERMINAL_PAYMENT_STATUSES = new Set(['PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'LATE_PAID']);
const CACHE_PREFIX = 'eduai:payos-checkout:';
const terminalPaymentIds = new Set<string>();
const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });

export const paymentService = {
  async create(orderId: string, idempotencyKey = createIdempotencyKey()) {
    const result = await client.post<PaymentCheckoutState>(
      `/payments/orders/${orderId}/request`,
      undefined,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    rememberCheckoutArtifact(result);
    return result;
  },

  async status(orderId: string) {
    const result = await client.get<PaymentCheckoutState>(`/payments/orders/${orderId}/request`);
    return hydrateCheckoutArtifact(result);
  },

  async pending() {
    const result = await client.get<PendingPaymentPage>('/payments/orders/pending?page=1&pageSize=20');
    return {
      ...result,
      items: result.items.map((item) => hydrateCheckoutArtifact(item)),
    };
  },

  async cancel(orderId: string, idempotencyKey = createIdempotencyKey()) {
    await client.post<{ orderId: string; orderStatus: string; paymentStatus: string | null }>(
      `/payments/orders/${orderId}/cancel`,
      undefined,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return this.status(orderId);
  },
};

export function getPaymentErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const messages: Record<string, string> = {
      PAYMENT_PROVIDER_DISABLED: 'Thanh toán PayOS chưa sẵn sàng. Đơn hàng vẫn được giữ an toàn.',
      PAYMENT_PROVIDER_UNAVAILABLE: 'PayOS đang tạm thời gián đoạn. Không tạo lại đơn; hệ thống cần đối soát yêu cầu hiện tại.',
      PAYMENT_PROVIDER_REJECTED: 'PayOS từ chối yêu cầu thanh toán. Vui lòng thử lại sau.',
      ORDER_PAYMENT_WINDOW_EXPIRED: 'Thời hạn thanh toán của đơn đã hết. Vui lòng tạo đơn mới.',
      REQUEST_IN_PROGRESS: 'Yêu cầu thanh toán đang được xử lý. Vui lòng chờ trạng thái mới.',
    };
    return messages[error.code] ?? error.message;
  }
  return 'Không thể tải yêu cầu thanh toán. Vui lòng kiểm tra lại sau.';
}

function rememberCheckoutArtifact(state: PaymentCheckoutState): void {
  const payment = state.payment;
  if (!payment || TERMINAL_PAYMENT_STATUSES.has(payment.status)) {
    if (payment) terminalPaymentIds.add(payment.id);
    removeCachedArtifact(state.orderId);
    return;
  }
  if (terminalPaymentIds.has(payment.id) || !safeQrImage(payment.qrCodeDataUrl)) return;
  const artifact: CachedCheckoutArtifact = {
    orderId: state.orderId,
    paymentId: payment.id,
    expiresAt: payment.expiresAt,
    ...(safeCheckoutUrl(payment.checkoutUrl) ? { checkoutUrl: payment.checkoutUrl } : {}),
    qrCodeDataUrl: payment.qrCodeDataUrl as string,
  };
  try {
    globalThis.localStorage?.setItem(`${CACHE_PREFIX}${state.orderId}`, JSON.stringify(artifact));
  } catch {
    // Checkout remains usable through the server-returned PayOS URL when storage is unavailable.
  }
}

function hydrateCheckoutArtifact(state: PaymentCheckoutState): PaymentCheckoutState {
  const payment = state.payment;
  if (!payment || TERMINAL_PAYMENT_STATUSES.has(payment.status)) {
    if (payment) terminalPaymentIds.add(payment.id);
    removeCachedArtifact(state.orderId);
    return state;
  }
  if (terminalPaymentIds.has(payment.id)) {
    removeCachedArtifact(state.orderId);
    return state;
  }
  const cached = readCachedArtifact(state.orderId);
  if (!cached || cached.paymentId !== payment.id || isExpired(cached.expiresAt)) {
    if (cached) removeCachedArtifact(state.orderId);
    return state;
  }
  return {
    ...state,
    payment: {
      ...payment,
      checkoutUrl: safeCheckoutUrl(payment.checkoutUrl)
        ? payment.checkoutUrl
        : cached.checkoutUrl,
      qrCodeDataUrl: safeQrImage(payment.qrCodeDataUrl)
        ? payment.qrCodeDataUrl
        : cached.qrCodeDataUrl,
    },
  };
}

function readCachedArtifact(orderId: string): CachedCheckoutArtifact | null {
  try {
    const raw = globalThis.localStorage?.getItem(`${CACHE_PREFIX}${orderId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedCheckoutArtifact>;
    if (
      parsed.orderId !== orderId ||
      typeof parsed.paymentId !== 'string' ||
      typeof parsed.expiresAt !== 'string' ||
      !safeQrImage(parsed.qrCodeDataUrl) ||
      (parsed.checkoutUrl !== undefined && !safeCheckoutUrl(parsed.checkoutUrl))
    ) {
      removeCachedArtifact(orderId);
      return null;
    }
    return parsed as CachedCheckoutArtifact;
  } catch {
    removeCachedArtifact(orderId);
    return null;
  }
}

function removeCachedArtifact(orderId: string): void {
  try {
    globalThis.localStorage?.removeItem(`${CACHE_PREFIX}${orderId}`);
  } catch {
    // Storage is a presentation cache only; payment state remains server-authoritative.
  }
}

function isExpired(value: string): boolean {
  const timestamp = new Date(value).getTime();
  return !Number.isFinite(timestamp) || timestamp <= Date.now();
}

function safeQrImage(value: string | undefined): string | undefined {
  return value?.startsWith('data:image/png;base64,') ? value : undefined;
}

function safeCheckoutUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.username === ''
      && url.password === ''
      && url.port === ''
      && ['pay.payos.vn', 'next.pay.payos.vn'].includes(url.hostname.toLowerCase())
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function createIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
