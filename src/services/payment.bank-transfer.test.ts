import { afterEach, describe, expect, it, vi } from "vitest";
import { paymentService } from "./payment.service";
const response = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), {
    headers: { "Content-Type": "application/json" },
  });
const pending = {
  orderId: "demo",
  orderNumber: "DEMO",
  orderStatus: "PENDING_PAYMENT",
  paymentRequired: true,
  payment: {
    id: "bank-demo",
    provider: "bank_transfer",
    status: "PENDING",
    amount: { amountMinor: "200000", currency: "VND" },
    expiresAt: "2099-01-01T00:00:00Z",
    qrCodeDataUrl: "data:image/png;base64,ZGVtbw==",
    bankTransfer: {
      bankName: "Demo",
      bankBin: "000000",
      accountNumber: "0000000000",
      beneficiaryName: "EDUAI SANDBOX",
      transferContent: "EDUDEMO01",
    },
  },
};
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});
describe("manual bank transfer API boundary", () => {
  it("sends explicit provider and never stores or restores bank artifacts from local storage", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(pending))
      .mockResolvedValueOnce(
        response({
          ...pending,
          payment: {
            ...pending.payment,
            qrCodeDataUrl: undefined,
            bankTransfer: undefined,
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await paymentService.create("demo", "create-demo", "bank_transfer");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      provider: "bank_transfer",
    });
    expect(fetchMock.mock.calls[0][1].headers.get("Idempotency-Key")).toBe(
      "create-demo",
    );
    expect(localStorage.getItem("eduai:payos-checkout:demo")).toBeNull();
    const status = await paymentService.status("demo");
    expect(status.payment?.qrCodeDataUrl).toBeUndefined();
    expect(status.payment?.bankTransfer).toBeUndefined();
  });
  it("offers only methods actually returned by server, rejecting unknown methods", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response({ methods: ["unknown", "bank_transfer", "vnpay"] }),
        ),
    );
    expect(await paymentService.methods()).toEqual(["bank_transfer", "vnpay"]);
  });
  it("support posts reason idempotently then reads canonical status rather than trusting response claims", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ status: "PAID" }))
      .mockResolvedValueOnce(
        response({
          ...pending,
          payment: { ...pending.payment, status: "NEEDS_SUPPORT" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const state = await paymentService.requestBankTransferSupport(
      "demo",
      "Cần tra soát giao dịch thử nghiệm",
      "support-demo",
    );
    expect(state.payment?.status).toBe("NEEDS_SUPPORT");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      reason: "Cần tra soát giao dịch thử nghiệm",
    });
    expect(fetchMock.mock.calls[0][1].headers.get("Idempotency-Key")).toBe(
      "support-demo",
    );
  });
});
