import { ApiClient, ApiClientError } from './api-client';
import { getAuthSession } from './auth.service';
import type { MoneyValue } from './commerce.service';

export type PaymentProvider = 'payos' | 'vnpay';

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
    provider: PaymentProvider;
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
  provider: PaymentProvider;
  checkoutUrl?: string;
  qrCodeDataUrl?: string;
}

const TERMINAL_PAYMENT_STATUSES = new Set(['PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'LATE_PAID']);
// Preserve the historical key while allowing only exact-host migration of legacy presentation data.
const CACHE_PREFIX = 'eduai:payos-checkout:';
const PAYOS_CHECKOUT_HOSTS = new Set(['pay.payos.vn', 'next.pay.payos.vn']);
const VNPAY_CHECKOUT_HOSTS = new Set(['sandbox.vnpayment.vn', 'pay.vnpay.vn']);
const terminalPaymentIds = new Set<string>();
const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });

class PaymentContractError extends Error {
  readonly name = 'PaymentContractError';

  constructor() {
    super('Payment response is missing a supported payment provider.');
  }
}

export const paymentService = {
  async create(orderId: string, idempotencyKey = createIdempotencyKey()) {
    const result = requireServerProvider(await client.post<PaymentCheckoutState>(
      `/payments/orders/${orderId}/request`,
      undefined,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    ));
    rememberCheckoutArtifact(result);
    return result;
  },

  async status(orderId: string) {
    const result = requireServerProvider(
      await client.get<PaymentCheckoutState>(`/payments/orders/${orderId}/request`),
    );
    return hydrateCheckoutArtifact(result);
  },

  async pending() {
    const result = await client.get<PendingPaymentPage>('/payments/orders/pending?page=1&pageSize=20');
    return {
      ...result,
      items: result.items.map((item) => hydrateCheckoutArtifact(requireServerProvider(item))),
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
      PAYMENT_PROVIDER_DISABLED: 'Cổng thanh toán chưa sẵn sàng. Đơn hàng vẫn được giữ an toàn.',
      PAYMENT_PROVIDER_UNAVAILABLE: 'Cổng thanh toán đang tạm thời gián đoạn. Không tạo lại đơn; hệ thống cần đối soát yêu cầu hiện tại.',
      PAYMENT_PROVIDER_REJECTED: 'Cổng thanh toán từ chối yêu cầu. Vui lòng thử lại sau.',
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
  if (terminalPaymentIds.has(payment.id)) return;
  const provider = resolvePaymentProvider(payment);
  const checkoutUrl = getTrustedCheckoutUrl(payment.checkoutUrl, provider);
  const qrCodeDataUrl = safeQrImage(payment.qrCodeDataUrl);
  if (!provider || (!checkoutUrl && !qrCodeDataUrl)) return;
  const artifact: CachedCheckoutArtifact = {
    orderId: state.orderId,
    paymentId: payment.id,
    expiresAt: payment.expiresAt,
    provider,
    ...(checkoutUrl ? { checkoutUrl } : {}),
    ...(qrCodeDataUrl ? { qrCodeDataUrl } : {}),
  };
  try {
    globalThis.localStorage?.setItem(`${CACHE_PREFIX}${state.orderId}`, JSON.stringify(artifact));
  } catch {
    // Checkout remains usable through the server-returned provider presentation when storage is unavailable.
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
  const provider = resolvePaymentProvider(payment);
  if (!provider || cached.provider !== provider) {
    if (cached.provider !== provider) removeCachedArtifact(state.orderId);
    return state;
  }
  return {
    ...state,
    payment: {
      ...payment,
      provider,
      checkoutUrl: getTrustedCheckoutUrl(payment.checkoutUrl, provider)
        ?? getTrustedCheckoutUrl(cached.checkoutUrl, provider),
      qrCodeDataUrl: provider === 'payos'
        ? safeQrImage(payment.qrCodeDataUrl) ?? cached.qrCodeDataUrl
        : undefined,
    },
  };
}

function readCachedArtifact(orderId: string): CachedCheckoutArtifact | null {
  try {
    const raw = globalThis.localStorage?.getItem(`${CACHE_PREFIX}${orderId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedCheckoutArtifact>;
    const checkoutUrl = getTrustedCheckoutUrl(parsed.checkoutUrl, parsed.provider);
    const qrCodeDataUrl = safeQrImage(parsed.qrCodeDataUrl);
    const provider = isPaymentProvider(parsed.provider)
      ? parsed.provider
      : inferLegacyCachedProvider(checkoutUrl, qrCodeDataUrl);
    if (
      parsed.orderId !== orderId ||
      typeof parsed.paymentId !== 'string' ||
      typeof parsed.expiresAt !== 'string' ||
      !provider ||
      (parsed.checkoutUrl !== undefined && !checkoutUrl) ||
      (!checkoutUrl && !qrCodeDataUrl)
    ) {
      removeCachedArtifact(orderId);
      return null;
    }
    return {
      orderId,
      paymentId: parsed.paymentId,
      expiresAt: parsed.expiresAt,
      provider,
      ...(checkoutUrl ? { checkoutUrl } : {}),
      ...(qrCodeDataUrl ? { qrCodeDataUrl } : {}),
    };
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

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return value === 'payos' || value === 'vnpay';
}

export function getTrustedCheckoutUrl(
  value: string | undefined,
  expectedProvider?: PaymentProvider,
): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== 'https:'
      || parsed.username !== ''
      || parsed.password !== ''
      || parsed.port !== ''
    ) return undefined;
    const hostname = parsed.hostname.toLowerCase();
    const provider = PAYOS_CHECKOUT_HOSTS.has(hostname)
      ? 'payos'
      : VNPAY_CHECKOUT_HOSTS.has(hostname)
        ? 'vnpay'
        : undefined;
    return provider && (!expectedProvider || provider === expectedProvider)
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function resolvePaymentProvider(
  payment: Pick<NonNullable<PaymentCheckoutState['payment']>, 'provider'>,
): PaymentProvider | undefined {
  return isPaymentProvider(payment.provider) ? payment.provider : undefined;
}

function requireServerProvider(state: PaymentCheckoutState): PaymentCheckoutState {
  if (state.payment && !isPaymentProvider(state.payment.provider)) {
    throw new PaymentContractError();
  }
  return state;
}

function inferLegacyCachedProvider(
  checkoutUrl: string | undefined,
  qrCodeDataUrl: string | undefined,
): PaymentProvider | undefined {
  if (checkoutUrl) {
    const hostname = new URL(checkoutUrl).hostname.toLowerCase();
    if (PAYOS_CHECKOUT_HOSTS.has(hostname)) return 'payos';
    if (VNPAY_CHECKOUT_HOSTS.has(hostname)) return 'vnpay';
  }
  return qrCodeDataUrl ? 'payos' : undefined;
}

function createIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
