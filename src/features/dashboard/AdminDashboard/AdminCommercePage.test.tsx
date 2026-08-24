import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommerceCatalogItem, CommerceOrderDetail } from "../../../services/admin-commerce.service";
import { AdminCommercePage } from "./AdminCommercePage";

const commerceApi = vi.hoisted(() => ({
  listCatalog: vi.fn(), updateCatalog: vi.fn(), listOrders: vi.fn(), getOrder: vi.fn(),
}));

vi.mock("../../../services/admin-commerce.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../services/admin-commerce.service")>();
  return { ...actual, adminCommerceService: commerceApi };
});

const item: CommerceCatalogItem = {
  id: "course-id", title: "NestJS Production", slug: "nestjs-production",
  priceAmountMinor: "250000", priceCurrency: "VND", status: "PUBLISHED",
  visibility: "PUBLIC", moderationStatus: "CLEAR", updatedAt: "2026-08-24T00:00:00.000Z",
  instructor: { id: "instructor-id", fullName: "Instructor" },
  product: { id: "product-id", status: "ACTIVE", archivedAt: null },
};

const order: CommerceOrderDetail = {
  id: "order-id", orderNumber: "EDU-ORDER-1", status: "CONFIRMED", fulfillmentStatus: "FULFILLED",
  subtotalAmountMinor: "250000", discountAmountMinor: "0", payableAmountMinor: "250000", currency: "VND",
  pricingPolicyVersion: "course-v1-single-promotion", createdAt: "2026-08-24T00:00:00.000Z", confirmedAt: "2026-08-24T00:01:00.000Z",
  buyer: { id: "buyer-id", email: "buyer@example.test", fullName: "Buyer" }, lineCount: 1, paymentStatus: "PAID",
  lines: [{ id: "line-id", productType: "COURSE", productReferenceId: "course-id", sellerId: "instructor-id", displayTitle: "NestJS Production", quantity: 1, unitListPriceAmountMinor: "250000", subtotalAmountMinor: "250000", discountAmountMinor: "0", finalAmountMinor: "250000", currency: "VND", benefits: [] }],
  paymentAttempts: [{ id: "attempt-id", status: "PAID", amountMinor: "250000", currency: "VND", providerStatusCheckedAt: null, createdAt: "2026-08-24T00:00:10.000Z", paidAt: "2026-08-24T00:01:00.000Z", closedAt: null }],
  settlements: [], lifecycle: [{ id: "event-id", previousStatus: "PENDING_PAYMENT", nextStatus: "CONFIRMED", actorKind: "PROVIDER", reasonCode: null, occurredAt: "2026-08-24T00:01:00.000Z", actor: null }],
};

describe("AdminCommercePage", () => {
  beforeEach(() => {
    Object.values(commerceApi).forEach((mock) => mock.mockReset());
    commerceApi.listCatalog.mockResolvedValue({ items: [item], page: 1, pageSize: 25, total: 1, totalPages: 1 });
    commerceApi.updateCatalog.mockResolvedValue({ ...item, priceAmountMinor: "300000" });
    commerceApi.listOrders.mockResolvedValue({ items: [order], page: 1, pageSize: 25, total: 1, totalPages: 1 });
    commerceApi.getOrder.mockResolvedValue(order);
  });

  it("updates the current catalog with server version and no historical totals", async () => {
    const user = userEvent.setup();
    render(<AdminCommercePage />);
    await user.click(await screen.findByRole("button", { name: "Chỉnh sửa NestJS Production" }));
    const price = screen.getByLabelText("Giá hiện tại (đồng)");
    await user.clear(price); await user.type(price, "300000");
    await user.click(screen.getByRole("button", { name: "Lưu cấu hình" }));
    await waitFor(() => expect(commerceApi.updateCatalog).toHaveBeenCalledWith("course-id", {
      priceAmountMinor: 300000, priceCurrency: "VND", sellable: true, expectedCourseUpdatedAt: item.updatedAt,
    }));
    expect(commerceApi.updateCatalog.mock.calls[0][1]).not.toHaveProperty("orderTotal");
  });

  it("shows the irreversible archive warning before disabling an active product", async () => {
    const user = userEvent.setup(); render(<AdminCommercePage />);
    await user.click(await screen.findByRole("button", { name: "Chỉnh sửa NestJS Production" }));
    await user.click(screen.getByRole("checkbox", { name: "Cho phép bán khóa học này" }));
    expect(screen.getByText(/lưu trữ vĩnh viễn định danh sản phẩm/i)).toBeInTheDocument();
  });

  it("loads read-only safe order lifecycle details", async () => {
    const user = userEvent.setup(); render(<AdminCommercePage />);
    await user.click(screen.getByRole("tab", { name: /Đơn hàng/ }));
    await user.click(await screen.findByRole("button", { name: "Xem đơn EDU-ORDER-1" }));
    expect(await screen.findByRole("heading", { name: "EDU-ORDER-1" })).toBeInTheDocument();
    expect(screen.getByText("PENDING PAYMENT → CONFIRMED")).toBeInTheDocument();
    expect(screen.getByText(/Trang này chỉ đọc/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hoàn tiền|xác nhận thanh toán/i })).not.toBeInTheDocument();
  });

  it("does not let a stale catalog failure overwrite a newer successful filter", async () => {
    const stale = deferred<never>();
    commerceApi.listCatalog.mockReset()
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce({ items: [item], page: 1, pageSize: 25, total: 1, totalPages: 1 });
    const user = userEvent.setup();
    render(<AdminCommercePage />);
    await user.click(screen.getByRole("button", { name: "Áp dụng bộ lọc" }));
    expect(await screen.findByText("NestJS Production")).toBeInTheDocument();
    stale.reject(new Error("stale failure"));
    await waitFor(() => expect(screen.queryByText("stale failure")).not.toBeInTheDocument());
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
