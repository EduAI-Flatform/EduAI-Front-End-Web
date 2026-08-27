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

const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });

export const paymentService = {
  create(orderId: string, idempotencyKey = createIdempotencyKey()) {
    return client.post<PaymentCheckoutState>(
      `/payments/orders/${orderId}/request`,
      undefined,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  },

  status(orderId: string) {
    return client.get<PaymentCheckoutState>(`/payments/orders/${orderId}/request`);
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

function createIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
