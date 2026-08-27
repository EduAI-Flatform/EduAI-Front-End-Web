import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adminCommerceService,
  type CommerceCatalogPage,
  type CommerceOrderPage,
  type PaymentReviewPage,
  type CommerceRefundPage,
} from "./admin-commerce.service";

afterEach(() => vi.unstubAllGlobals());

function ok<T>(data: T) {
  return new Response(JSON.stringify({ success: true, data, message: "OK" }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

describe("adminCommerceService", () => {
  it("loads bounded catalog and order pages with explicit filters", async () => {
    const catalog: CommerceCatalogPage = { items: [], page: 2, pageSize: 25, total: 0, totalPages: 0 };
    const orders: CommerceOrderPage = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };
    const fetchMock = vi.fn().mockResolvedValueOnce(ok(catalog)).mockResolvedValueOnce(ok(orders));
    vi.stubGlobal("fetch", fetchMock);

    await adminCommerceService.listCatalog({ page: 2, pageSize: 25, search: "Nest JS", sellability: "sellable" });
    await adminCommerceService.listOrders({ page: 1, pageSize: 25, status: "confirmed", fulfillmentStatus: "fulfilled" });

    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringMatching(/catalog\?page=2&pageSize=25&search=Nest\+JS&sellability=sellable$/), expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringMatching(/orders\?page=1&pageSize=25&status=confirmed&fulfillmentStatus=fulfilled$/), expect.objectContaining({ method: "GET" }));
  });

  it("patches only current price, currency, sellability, and optimistic version", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ id: "course-id" }));
    vi.stubGlobal("fetch", fetchMock);
    const input = { priceAmountMinor: 250000, priceCurrency: "VND" as const, sellable: true, expectedCourseUpdatedAt: "2026-08-24T00:00:00.000Z" };

    await adminCommerceService.updateCatalog("course-id", input);

    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/catalog\/course-id$/), expect.objectContaining({ method: "PATCH", body: JSON.stringify(input) }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(input);
  });

  it("uses bounded review, run, and optimistic resolution contracts", async () => {
    const reviews: PaymentReviewPage = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok(reviews))
      .mockResolvedValueOnce(ok({ checkedCount: 0 }))
      .mockResolvedValueOnce(ok({ id: "case-id", status: "RESOLVED" }));
    vi.stubGlobal("fetch", fetchMock);

    await adminCommerceService.listPaymentReviews({ page: 1, pageSize: 25, status: "open" });
    await adminCommerceService.runPaymentReconciliation(20);
    await adminCommerceService.resolvePaymentReview("case-id", {
      resolution: "acknowledged",
      expectedUpdatedAt: "2026-08-27T00:00:00.000Z",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining("reconciliation/cases?page=1&pageSize=25&status=open"), expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining("reconciliation/runs"), expect.objectContaining({ method: "POST", body: JSON.stringify({ limit: 20 }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.stringContaining("cases/case-id/resolve"), expect.objectContaining({ method: "POST" }));
  });

  it("uses bounded expiry and explicit confirmed manual-refund contracts", async () => {
    const refunds: CommerceRefundPage = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok(refunds))
      .mockResolvedValueOnce(ok({ checkedCount: 0 }))
      .mockResolvedValueOnce(ok({ id: "refund-id", status: "RECORDED" }));
    vi.stubGlobal("fetch", fetchMock);
    await adminCommerceService.listRefunds({ page: 1, pageSize: 25, status: "requested" });
    await adminCommerceService.runPaymentExpiry(20);
    await adminCommerceService.recordRefund("refund-id", {
      externalReference: "manual-ref",
      confirmExternalAction: true,
      expectedUpdatedAt: "2026-08-27T00:00:00.000Z",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining("refunds?page=1&pageSize=25&status=requested"), expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining("payment-lifecycle/expiry-runs"), expect.objectContaining({ method: "POST", body: JSON.stringify({ limit: 20 }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.stringContaining("refunds/refund-id/record"), expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ externalReference: "manual-ref", confirmExternalAction: true, expectedUpdatedAt: "2026-08-27T00:00:00.000Z" }),
    }));
  });
});
