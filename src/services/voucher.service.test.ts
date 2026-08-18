import { afterEach, describe, expect, it, vi } from "vitest";
import { adminVoucherService, voucherService } from "./voucher.service";

describe("voucherService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts only the voucher code and course id to the server-authoritative preview", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            voucherId: "voucher-1",
            code: "EDUAI20",
            currency: "VND",
            eligible: true,
            reason: "eligible",
            discountAmountMinor: 200000,
            finalAmountMinor: 1299000,
          },
          message: "ok",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(voucherService.preview("course-1", " eduai20 ")).resolves.toMatchObject({
      eligible: true,
      finalAmountMinor: 1299000,
    });

    const [, request] = fetchMock.mock.calls[0];
    expect(request?.method).toBe("POST");
    expect(request?.body).toBe(JSON.stringify({ code: " eduai20 " }));
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/courses/course-1/voucher-preview",
    );
    expect(String(request?.body)).not.toContain("1299000");
  });

  it("keeps admin mutations on the protected voucher API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { id: "voucher-1" }, message: "ok" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await adminVoucherService.create({
      code: "EDUAI20",
      kind: "percentage",
      value: 20,
      currency: "VND",
      startsAt: "2026-08-01T00:00:00.000Z",
      endsAt: "2026-09-01T00:00:00.000Z",
      status: "draft",
    });

    expect(String(fetchMock.mock.calls[0][0])).toContain("/admin/vouchers");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
  });
});
