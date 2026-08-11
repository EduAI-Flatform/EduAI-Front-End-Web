import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adminModerationService,
  type AdminModerationDetail,
  type AdminModerationPage,
} from "./admin-moderation.service";

const item = {
  id: "11111111-1111-4111-8111-111111111111",
  targetType: "course" as const,
  title: "Review target",
  content: "Non-sensitive course description",
  owner: {
    id: "22222222-2222-4222-8222-222222222222",
    fullName: "Course Owner",
  },
  moderationStatus: "clear" as const,
  moderationReason: null,
  moderatedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function successfulResponse<T>(data: T) {
  return new Response(
    JSON.stringify({ success: true, data, message: "OK" }),
    { headers: { "Content-Type": "application/json" }, status: 200 },
  );
}

describe("adminModerationService", () => {
  it("loads a target-specific bounded moderation page", async () => {
    const page: AdminModerationPage = {
      items: [item],
      page: 2,
      pageSize: 25,
      total: 26,
      totalPages: 2,
    };
    const fetchMock = vi.fn().mockResolvedValue(successfulResponse(page));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      adminModerationService.list({
        targetType: "course",
        status: "clear",
        search: "review target",
        page: 2,
        pageSize: 25,
      }),
    ).resolves.toEqual(page);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/v1\/admin\/moderation\?targetType=course&page=2&pageSize=25&status=clear&search=review\+target$/,
      ),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("loads exact detail and sends an explicit reasoned transition", async () => {
    const detail: AdminModerationDetail = { item, history: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(successfulResponse(detail))
      .mockResolvedValueOnce(
        successfulResponse({
          ...item,
          moderationStatus: "rejected",
          moderationReason: "Confirmed policy violation",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      adminModerationService.get("course", item.id),
    ).resolves.toEqual(detail);
    await adminModerationService.moderate("course", item.id, {
      action: "reject",
      reason: "Confirmed policy violation",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/api\/v1\/admin\/moderation\/course\/.+$/),
      expect.objectContaining({
        body: JSON.stringify({
          action: "reject",
          reason: "Confirmed policy violation",
        }),
        method: "PATCH",
      }),
    );
  });
});
