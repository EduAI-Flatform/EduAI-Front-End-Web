import { afterEach, describe, expect, it, vi } from "vitest";
import { adminScholarshipService, scholarshipService } from "./scholarship.service";

describe("scholarshipService", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads eligible campaigns for the course and applies with course context only", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ success: true, data: [], message: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    await scholarshipService.listEligible("course-1");
    await scholarshipService.apply("scholarship-1", "course-1");

    expect(String(fetchMock.mock.calls[0][0])).toContain("/scholarships?courseId=course-1");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/scholarships/scholarship-1/applications");
    expect(fetchMock.mock.calls[1][1]?.body).toBe(JSON.stringify({ courseId: "course-1" }));
  });

  it("keeps campaign mutations on the protected admin API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ success: true, data: { id: "scholarship-1" }, message: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    await adminScholarshipService.create({ title: "Grant", applicationMode: "application", benefitKind: "course_access", benefitValue: 1, startsAt: "2026-08-01", endsAt: "2026-09-01" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/admin/scholarships");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
  });
});
