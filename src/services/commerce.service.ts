import { getAuthSession } from './auth.service';
import { ApiClient, ApiClientError } from './api-client';

export type CartAvailability =
  | 'AVAILABLE'
  | 'ALREADY_OWNED'
  | 'COURSE_UNAVAILABLE'
  | 'PAYMENT_NOT_REQUIRED'
  | 'UNSUPPORTED_CURRENCY';

export interface MoneyValue {
  amountMinor: string;
  currency: 'VND';
}

export interface CommerceCartItem {
  id: string;
  productId: string;
  course: { id: string; title: string; slug: string; thumbnailUrl: string | null };
  unitPrice: MoneyValue;
  quantity: 1;
  availability: CartAvailability;
  warnings: string[];
}

export interface CommerceCart {
  id: string | null;
  status: 'ACTIVE';
  currency: 'VND';
  items: CommerceCartItem[];
  summary: MoneyValue & { itemCount: number; canCheckout: boolean };
}

export interface CommerceOrder {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentStatus: string;
  subtotal: MoneyValue;
  discount: MoneyValue;
  payable: MoneyValue;
  pricingPolicyVersion: string;
  lines: Array<{
    id: string;
    courseId: string;
    title: string;
    unitListPrice: MoneyValue;
    finalPrice: MoneyValue;
    benefits: Array<{ type: 'VOUCHER'; sourceId: string; discount: MoneyValue }>;
  }>;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const commerceService = {
  getCart(): Promise<CommerceCart> {
    return authenticatedApiClient.get<CommerceCart>('/commerce/cart');
  },

  addCourse(courseId: string): Promise<CommerceCart> {
    return authenticatedApiClient.post<CommerceCart>('/commerce/cart/items', { courseId });
  },

  removeCourse(courseId: string): Promise<CommerceCart> {
    return authenticatedApiClient.delete<CommerceCart>(`/commerce/cart/items/${courseId}`);
  },

  clearCart(): Promise<CommerceCart> {
    return authenticatedApiClient.delete<CommerceCart>('/commerce/cart/items');
  },

  createOrder(
    voucherApplications: Array<{ courseId: string; code: string }>,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<CommerceOrder> {
    return authenticatedApiClient.post<CommerceOrder>(
      '/commerce/orders',
      { voucherApplications },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  },
};

export function formatCommerceMoney(value: MoneyValue): string {
  if (!/^\d+$/.test(value.amountMinor) || value.currency !== 'VND') return '—';
  const amount = BigInt(value.amountMinor);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getCommerceErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const messages: Record<string, string> = {
      ALREADY_OWNED: 'Bạn đã có quyền truy cập khóa học này.',
      EMPTY_CART: 'Giỏ hàng hiện không có khóa học.',
      STALE_CART: 'Một khóa học đã thay đổi. Vui lòng kiểm tra lại giỏ hàng.',
      REQUEST_IN_PROGRESS: 'Yêu cầu trước đang được xử lý. Vui lòng chờ.',
    };
    return messages[error.code] ?? error.message;
  }
  return 'Không thể xử lý giỏ hàng. Vui lòng thử lại.';
}

function createIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
