import { describe, expect, it, vi } from "vitest";

describe("job service query contract", () => {
  it("encodes pagination and search parameters", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, data: { items: [], page: 2, pageSize: 10, total: 0, totalPages: 0 }, message: "OK" }), { status: 200, headers: { "content-type": "application/json" } }));
    const { jobService } = await import("./job.service");
    await jobService.list({ page: 2, pageSize: 10, search: "AI Engineer" });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("page=2&pageSize=10&search=AI+Engineer"), expect.any(Object));
    fetchMock.mockRestore();
  });
});
