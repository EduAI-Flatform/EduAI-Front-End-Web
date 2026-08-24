import { afterEach, describe, expect, it, vi } from "vitest";
import { adminMembershipService } from "./admin-membership.service";

afterEach(() => vi.unstubAllGlobals());

function ok(data: unknown) {
  return new Response(JSON.stringify({ success: true, data, message: "OK" }), {
    headers: { "Content-Type": "application/json" }, status: 200,
  });
}

describe("adminMembershipService", () => {
  it("uses bounded plan filters and string monetary input", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok({ items: [], page: 2, pageSize: 20, total: 0, totalPages: 0 })).mockResolvedValueOnce(ok({ id: "version" }));
    vi.stubGlobal("fetch", fetchMock);
    await adminMembershipService.listPlans({ page: 2, pageSize: 20, search: "Hội viên", status: "active" });
    const input = { displayName: "Vàng", baseMonthlyPriceAmountMinor: "120000", currency: "VND" as const, durations: [{ months: 3, discountPercent: 20, displayOrder: 0 }] };
    await adminMembershipService.createVersion("plan-id", input);
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringMatching(/plans\?page=2&pageSize=20&search=H%E1%BB%99i\+vi%C3%AAn&status=active$/), expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringMatching(/plans\/plan-id\/versions$/), expect.objectContaining({ method: "POST", body: JSON.stringify(input) }));
  });

  it("keeps publish and configuration on explicit version boundaries", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(ok({ id: "result" })));
    vi.stubGlobal("fetch", fetchMock);
    await adminMembershipService.publishVersion("version-id");
    await adminMembershipService.configureEntitlement("version-id", { definitionId: "definition-id", quota: "25" });
    await adminMembershipService.includeCourse("version-id", { courseId: "course-id", graceDays: 30 });
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual(expect.arrayContaining([
      expect.stringMatching(/versions\/version-id\/publish$/),
      expect.stringMatching(/versions\/version-id\/service-entitlements$/),
      expect.stringMatching(/versions\/version-id\/included-courses$/),
    ]));
  });

  it("loads bounded administrator-visible courses for explicit grants", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    await adminMembershipService.listAvailableCourses("private");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/available-courses\?page=1&pageSize=100&search=private$/), expect.objectContaining({ method: "GET" }));
  });
});
