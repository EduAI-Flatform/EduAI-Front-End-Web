import { afterEach, describe, expect, it, vi } from "vitest";
import { adminAuditService } from "./admin-audit.service";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adminAuditService", () => {
  it("loads filtered audit records through the authenticated GET client", async () => {
    const result = {
      items: [],
      page: 2,
      pageSize: 25,
      total: 0,
      totalPages: 0,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: result, message: "OK" }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      adminAuditService.list({
        page: 2,
        pageSize: 25,
        search: "course publish",
        action: "COURSE_PUBLISHED",
        targetType: "course",
      }),
    ).resolves.toEqual(result);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/v1\/admin\/audit-logs\?page=2&pageSize=25&search=course\+publish&action=COURSE_PUBLISHED&targetType=course$/,
      ),
      expect.objectContaining({ method: "GET" }),
    );
  });
});
