import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommerceCatalogItem, CommerceOrderDetail, PaymentReview } from "../../../services/admin-commerce.service";
import { AdminCommercePage } from "./AdminCommercePage";

const commerceApi = vi.hoisted(() => ({
  listCatalog: vi.fn(), updateCatalog: vi.fn(), listOrders: vi.fn(), getOrder: vi.fn(),
  listPaymentReviews: vi.fn(), runPaymentReconciliation: vi.fn(), resolvePaymentReview: vi.fn(),
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

const review: PaymentReview = {
  id: "review-id", kind: "PROVIDER_OUTAGE", reasonCode: "PROVIDER_STATUS_UNAVAILABLE",
  status: "OPEN", resolution: null, openedAt: "2026-08-27T00:00:00.000Z",
  updatedAt: "2026-08-27T00:00:00.000Z", lastCheckedAt: "2026-08-27T00:00:00.000Z",
  checkCount: 1, resolvedAt: null,
  order: { orderNumber: "EDU-ORDER-1", status: "PENDING_PAYMENT", fulfillmentStatus: "NOT_STARTED", payableAmountMinor: "250000", currency: "VND" },
  paymentAttempt: { status: "PENDING", providerStatusCheckedAt: "2026-08-27T00:00:00.000Z" },
  settlement: null, resolvedBy: null,
};

describe("AdminCommercePage", () => {
  beforeEach(() => {
    Object.values(commerceApi).forEach((mock) => mock.mockReset());
    commerceApi.listCatalog.mockResolvedValue({ items: [item], page: 1, pageSize: 25, total: 1, totalPages: 1 });
    commerceApi.updateCatalog.mockResolvedValue({ ...item, priceAmountMinor: "300000" });
    commerceApi.listOrders.mockResolvedValue({ items: [order], page: 1, pageSize: 25, total: 1, totalPages: 1 });
    commerceApi.getOrder.mockResolvedValue(order);
    commerceApi.listPaymentReviews.mockResolvedValue({ items: [review], page: 1, pageSize: 25, total: 1, totalPages: 1 });
    commerceApi.runPaymentReconciliation.mockResolvedValue({ checkedCount: 1, recoveredCount: 0, reviewRequiredCount: 1, hasMore: false, nextCursor: null });
    commerceApi.resolvePaymentReview.mockResolvedValue({ id: review.id, status: "RESOLVED", resolution: "ACKNOWLEDGED", resolvedAt: "2026-08-27T00:01:00.000Z" });
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

  it("shows sanitized review evidence and submits the constrained resolution", async () => {
    const user = userEvent.setup();
    render(<AdminCommercePage />);
    await user.click(screen.getByRole("tab", { name: /Reconciliation/ }));
    await user.click(await screen.findByRole("button", { name: "Review EDU-ORDER-1" }));
    expect(screen.getByText("PROVIDER STATUS UNAVAILABLE")).toBeInTheDocument();
    expect(screen.queryByText(/payment-link|provider identity/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Acknowledge reviewed evidence" }));
    await waitFor(() => expect(commerceApi.resolvePaymentReview).toHaveBeenCalledWith(
      review.id,
      { resolution: "acknowledged", expectedUpdatedAt: review.updatedAt },
    ));
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
