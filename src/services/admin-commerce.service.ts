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
};

export function getAdminCommerceErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) return error.message;
  return "Không thể tải dữ liệu thương mại. Vui lòng thử lại.";
}
