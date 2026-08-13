import { afterEach, describe, expect, it, vi } from "vitest";
import {
  notificationService,
  type NotificationPage,
} from "./notification.service";

afterEach(() => {
  vi.unstubAllGlobals();
});

function successfulResponse<T>(data: T) {
  return new Response(
    JSON.stringify({ success: true, data, message: "OK" }),
    { headers: { "Content-Type": "application/json" }, status: 200 },
  );
}

describe("notificationService", () => {
  it("uses the notification API for bounded unread pages", async () => {
    const page: NotificationPage = {
      items: [],
      page: 2,
      pageSize: 25,
      total: 26,
      totalPages: 2,
    };
    const fetchMock = vi.fn().mockResolvedValue(successfulResponse(page));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      notificationService.list({ page: 2, pageSize: 25, unreadOnly: true }),
    ).resolves.toEqual(page);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/v1\/notifications\?page=2&pageSize=25&unreadOnly=true$/,
      ),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("uses explicit read endpoints for one or all notifications", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => successfulResponse({ updatedCount: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    await notificationService.markAsRead("13aa8a9b-8fe5-4ec0-9ac8-b6f2a2ad29aa");
    await notificationService.markAllAsRead();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/api\/v1\/notifications\/.+\/read$/),
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/api\/v1\/notifications\/read-all$/),
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
