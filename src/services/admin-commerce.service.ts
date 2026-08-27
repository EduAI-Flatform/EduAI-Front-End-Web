import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export type CommerceCatalogFilter = "sellable" | "not_sellable" | "archived";

export interface CommerceCatalogItem {
  id: string;
  title: string;
  slug: string;
  priceAmountMinor: string | null;
  priceCurrency: string | null;
  status: string;
  visibility: string;
  moderationStatus: string;
  updatedAt: string;
  instructor: { id: string; fullName: string };
  product: { id: string; status: string; archivedAt: string | null } | null;
}

export interface CommerceCatalogPage {
  items: CommerceCatalogItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CommerceCatalogQuery {
  page: number;
  pageSize: number;
  search?: string;
  sellability?: CommerceCatalogFilter;
}

export interface CommerceCatalogUpdate {
  priceAmountMinor: number;
  priceCurrency: "VND";
  sellable: boolean;
  expectedCourseUpdatedAt: string;
}

export interface CommerceOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentStatus: string;
  subtotalAmountMinor: string;
  discountAmountMinor: string;
  payableAmountMinor: string;
  currency: string;
  pricingPolicyVersion: string;
  createdAt: string;
  confirmedAt: string | null;
  buyer: { id: string; email: string; fullName: string };
  lineCount: number;
  paymentStatus: string;
}

export interface CommerceOrderPage {
  items: CommerceOrderSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CommerceOrderQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  fulfillmentStatus?: string;
}

export interface CommerceOrderDetail extends CommerceOrderSummary {
  lines: Array<{
    id: string;
    productType: string;
    productReferenceId: string;
    sellerId: string;
    displayTitle: string;
    quantity: number;
    unitListPriceAmountMinor: string;
    subtotalAmountMinor: string;
    discountAmountMinor: string;
    finalAmountMinor: string;
    currency: string;
    benefits: Array<{
      type: string;
      sourceId: string;
      policyVersion: string;
      sourceVersion: string | null;
      allocatedDiscountAmountMinor: string;
    }>;
  }>;
  paymentAttempts: Array<{
    id: string;
    status: string;
    amountMinor: string;
    currency: string;
    providerStatusCheckedAt: string | null;
    createdAt: string;
    paidAt: string | null;
    closedAt: string | null;
  }>;
  settlements: Array<{
    id: string;
    kind: string;
    disposition: string;
    amountMinor: string;
    currency: string;
    settledAt: string;
    recordedAt: string;
  }>;
  lifecycle: Array<{
    id: string;
    previousStatus: string | null;
    nextStatus: string;
    actorKind: string;
    reasonCode: string | null;
    occurredAt: string;
    actor: { id: string; email: string; fullName: string } | null;
  }>;
}

export interface PaymentReview {
  id: string;
  kind: string;
  reasonCode: string;
  status: string;
  resolution: string | null;
  openedAt: string;
  updatedAt: string;
  lastCheckedAt: string | null;
  checkCount: number;
  resolvedAt: string | null;
  order: {
    orderNumber: string;
    status: string;
    fulfillmentStatus: string;
    payableAmountMinor: string;
    currency: string;
  };
  paymentAttempt: { status: string; providerStatusCheckedAt: string | null } | null;
  settlement: {
    disposition: string;
    amountMinor: string;
    currency: string;
    settledAt: string;
  } | null;
  resolvedBy: { id: string; email: string; fullName: string } | null;
}

export interface PaymentReviewPage {
  items: PaymentReview[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CommerceRefund {
  id: string;
  status: string;
  amountMinor: string;
  currency: string;
  provider: string | null;
  externalReference: string | null;
  reasonCode: string;
  rejectionReasonCode: string | null;
  createdAt: string;
  updatedAt: string;
  recordedAt: string | null;
  rejectedAt: string | null;
  order: { orderNumber: string; status: string };
  settlement: { amountMinor: string; currency: string; settledAt: string };
  requestedBy: { id: string; email: string; fullName: string };
  recordedBy: { id: string; email: string; fullName: string } | null;
  allocations: Array<{
    orderLineId: string;
    amountMinor: string;
    currency: string;
    productType: string;
    displayTitle: string;
  }>;
}
export interface CommerceRefundPage {
  items: CommerceRefund[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const client = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.toString();
}

export const adminCommerceService = {
  listCatalog(query: CommerceCatalogQuery): Promise<CommerceCatalogPage> {
    return client.get(`/admin/commerce/catalog?${queryString({ page: query.page, pageSize: query.pageSize, search: query.search, sellability: query.sellability })}`);
  },

  updateCatalog(courseId: string, input: CommerceCatalogUpdate): Promise<CommerceCatalogItem> {
    return client.patch(`/admin/commerce/catalog/${courseId}`, { ...input });
  },

  listOrders(query: CommerceOrderQuery): Promise<CommerceOrderPage> {
    return client.get(`/admin/commerce/orders?${queryString({ page: query.page, pageSize: query.pageSize, search: query.search, status: query.status, fulfillmentStatus: query.fulfillmentStatus })}`);
  },

  getOrder(orderId: string): Promise<CommerceOrderDetail> {
    return client.get(`/admin/commerce/orders/${orderId}`);
  },

  listPaymentReviews(query: { page: number; pageSize: number; status?: string; kind?: string }): Promise<PaymentReviewPage> {
    return client.get(`/admin/commerce/reconciliation/cases?${queryString(query)}`);
  },

  getPaymentReview(caseId: string): Promise<PaymentReview> {
    return client.get(`/admin/commerce/reconciliation/cases/${caseId}`);
  },

  runPaymentReconciliation(limit = 20): Promise<{
    checkedCount: number;
    recoveredCount: number;
    reviewRequiredCount: number;
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    return client.post('/admin/commerce/reconciliation/runs', { limit });
  },

  resolvePaymentReview(
    caseId: string,
    input: { resolution: 'acknowledged' | 'retry_succeeded'; expectedUpdatedAt: string },
  ): Promise<{ id: string; status: string; resolution: string; resolvedAt: string }> {
    return client.post(`/admin/commerce/reconciliation/cases/${caseId}/resolve`, input);
  },

  listRefunds(query: { page: number; pageSize: number; status?: string }): Promise<CommerceRefundPage> {
    return client.get(`/admin/commerce/refunds?${queryString(query)}`);
  },

  recordRefund(refundId: string, input: {
    externalReference: string;
    confirmExternalAction: true;
    expectedUpdatedAt: string;
  }): Promise<CommerceRefund> {
    return client.post(`/admin/commerce/refunds/${refundId}/record`, input);
  },

  rejectRefund(refundId: string, input: {
    rejectionReasonCode: string;
    expectedUpdatedAt: string;
  }): Promise<CommerceRefund> {
    return client.post(`/admin/commerce/refunds/${refundId}/reject`, input);
  },

  runPaymentExpiry(limit = 20): Promise<{
    checkedCount: number;
    expiredCount: number;
    settledCount: number;
    reviewRequiredCount: number;
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    return client.post('/admin/commerce/payment-lifecycle/expiry-runs', { limit });
  },
};

export function getAdminCommerceErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) return error.message;
  return "Không thể tải dữ liệu thương mại. Vui lòng thử lại.";
}
