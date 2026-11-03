import { afterEach, describe, expect, it, vi } from "vitest";
import { revenueSharingService, activationInput, percentToBasisPoints } from "./revenue-sharing.service";

const ok = (data: unknown = {}) => new Response(JSON.stringify({ success: true, data, message: "OK" }), { headers: { "Content-Type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());

describe("revenue sharing activation", () => {
  it("omits notice days for immediate changes", () => {
    expect(activationInput("immediate", "30")).toEqual({ noticeMode: "immediate" });
  });
  it("requires positive whole notice days only for delayed changes", () => {
    for (const days of ["", "0", "-1", "1.5", "NaN", "3651"]) expect(() => activationInput("delayed", days)).toThrow();
    expect(activationInput("delayed", "7")).toEqual({ noticeMode: "delayed", noticeDays: 7 });
  });
  it("converts two-decimal percentages without floating point rounding", () => {
    expect(percentToBasisPoints("20.15")).toBe(2015);
    expect(percentToBasisPoints("0")).toBe(0);
    expect(percentToBasisPoints("100")).toBe(10000);
    for (const value of ["", "100.01", "-1", "1.001", "NaN"]) expect(() => percentToBasisPoints(value)).toThrow();
  });
});

describe("revenue sharing API", () => {
  it("uses admin endpoints and preserves exact monetary strings", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(ok()));
    vi.stubGlobal("fetch", fetchMock);
    const input = { planId: "plan", sourceVersionId: "version", termsId: "terms", platformFeeBps: 2000, rules: [{ priority: 0, weight: 2, minPriceAmountMinor: "9007199254740993" }], overrides: [], noticeMode: "immediate" as const };
    await revenueSharingService.previewPolicy(input);
    await revenueSharingService.schedulePolicy(input);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/admin\/revenue-sharing\/plan-policies\/preview$/);
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "POST", body: JSON.stringify(input) }));
  });
  it("uses course ownership endpoints and encoded resource identifiers", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(ok()));
    vi.stubGlobal("fetch", fetchMock);
    await revenueSharingService.previewCourse("course/id");
    await revenueSharingService.accept("course/id", "terms");
    await revenueSharingService.leave("course/id");
    expect(fetchMock.mock.calls[0][0]).toMatch(/courses\/course%2Fid\/preview$/);
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "POST", body: JSON.stringify({ termsId: "terms" }) }));
    expect(fetchMock.mock.calls[2][1]).toEqual(expect.objectContaining({ method: "DELETE" }));
  });
  it("paginates reports and propagates API failures", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok()).mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } }), { status: 403, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await revenueSharingService.report("seller", 2, 25);
    expect(fetchMock.mock.calls[0][0]).toMatch(/seller\/revenue-sharing\/report\?page=2&pageSize=25$/);
    await expect(revenueSharingService.state()).rejects.toThrow("Access denied");
  });
});