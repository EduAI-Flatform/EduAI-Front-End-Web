import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adminCommerceService,
  type CommerceCatalogPage,
  type CommerceOrderPage,
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
});
