import { ApiClientError } from './api-client';
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminTmiService, tmiService, getTmiErrorMessage } from "./tmi.service";

describe("tmiService", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads the learner catalog, wallet, and ledger from protected endpoints", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ success: true, data: {}, message: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await tmiService.listRewards();
    await tmiService.wallet();
    await tmiService.history();

    expect(String(fetchMock.mock.calls[0][0])).toContain("/tmi/rewards?page=1&pageSize=20");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/tmi/wallet");
    expect(String(fetchMock.mock.calls[2][0])).toContain("/tmi/history");
  });

  it("sends only an idempotency key for a redemption request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ success: true, data: { id: "redemption-1" }, message: "ok" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await tmiService.redeem("reward-1", "request-123456");

    expect(String(fetchMock.mock.calls[0][0])).toContain("/tmi/rewards/reward-1/redemptions");
    expect(fetchMock.mock.calls[0][1]?.body).toBe(
      JSON.stringify({ idempotencyKey: "request-123456" }),
    );
  });

  it("keeps admin catalog, history, adjustment, and refund calls on protected endpoints", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ success: true, data: { items: [] }, message: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await adminTmiService.listRewards();
    await adminTmiService.listRedemptions();
    await adminTmiService.listLedger();
    await adminTmiService.adjustBalance({ userId: "user-1", amount: 10, direction: "credit", adjustmentKey: "adjust-001", reason: "Support correction" });
    await adminTmiService.refund("redemption-1", { reason: "Reward unavailable" });

    expect(String(fetchMock.mock.calls[0][0])).toContain("/admin/tmi/rewards?page=1&pageSize=20");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/admin/tmi/redemptions?page=1&pageSize=20");
    expect(String(fetchMock.mock.calls[2][0])).toContain("/admin/tmi/ledger?page=1&pageSize=20");
    expect(String(fetchMock.mock.calls[3][0])).toContain("/admin/tmi/adjustments");
    expect(String(fetchMock.mock.calls[4][0])).toContain("/admin/tmi/redemptions/redemption-1/refund");
  });
});

describe('adjustment conflict system message', () => {
 afterEach(() => localStorage.removeItem('gds.locale.v1'));
 it.each([undefined, 'trace-123'])('localizes the existing 409 message and preserves correlation (%s)', correlation => {
  const error = new ApiClientError('TMI adjustment key already used with a different payload', 'CONFLICT', 409, correlation);
  localStorage.setItem('gds.locale.v1', 'vi');
  expect(getTmiErrorMessage(error)).toContain('Mã điều chỉnh này đã được dùng với nội dung khác.');
  localStorage.setItem('gds.locale.v1', 'en');
  expect(getTmiErrorMessage(error)).toContain('This adjustment key was already used with different details.');
  if (correlation) expect(getTmiErrorMessage(error)).toContain(correlation);
 });
 it('leaves unknown server failures unchanged', () => {
  localStorage.setItem('gds.locale.v1', 'vi');
  expect(getTmiErrorMessage(new ApiClientError('External failure X982', 'UNKNOWN', 500))).toBe('External failure X982');
 });
});
