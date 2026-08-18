import { afterEach, describe, expect, it, vi } from "vitest";
import { tmiService } from "./tmi.service";

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
});
