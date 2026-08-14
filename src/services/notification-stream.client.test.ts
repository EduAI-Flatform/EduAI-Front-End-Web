import { afterEach, describe, expect, it, vi } from "vitest";
import { saveAuthSession } from "./auth.service";
import { NotificationStreamClient } from "./notification-stream.client";
import type { InAppNotification } from "./notification.service";

const notification = {
  body: "Your assignment has been graded.",
  category: "assignment",
  createdAt: "2026-08-14T00:00:01.000Z",
  id: "f27cb06b-0133-4d0e-8f72-1c98a8c6624d",
  isRead: false,
  link: "/assignments/assignment-id/submissions/me",
  readAt: null,
  title: "Assignment graded",
  type: "assignment_graded",
};

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

function streamResponse(payload: string): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(payload));
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" }, status: 200 },
  );
}

describe("NotificationStreamClient", () => {
  it("sends the authenticated reconnect request and emits a valid matching event", async () => {
    saveAuthSession({
      accessToken: "access-token",
      expiresIn: 900,
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      user: {} as never,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse(
        `id: ${notification.id}\nevent: notification\ndata: ${JSON.stringify(notification)}\n\n`,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const received: InAppNotification[] = [];

    await expect(
      new NotificationStreamClient().connect({
        lastEventId: "13aa8a9b-8fe5-4ec0-9ac8-b6f2a2ad29aa",
        onNotification: (event) => received.push(event),
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("Notification stream closed.");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/notifications\/stream$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "Last-Event-ID": "13aa8a9b-8fe5-4ec0-9ac8-b6f2a2ad29aa",
        }),
      }),
    );
    expect(received).toEqual([notification]);
  });

  it("ignores an event when its SSE ID does not match the safe payload ID", async () => {
    saveAuthSession({
      accessToken: "access-token",
      expiresIn: 900,
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      user: {} as never,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamResponse(`id: unrelated-id\nevent: notification\ndata: ${JSON.stringify(notification)}\n\n`),
      ),
    );
    const received: InAppNotification[] = [];

    await new NotificationStreamClient()
      .connect({ onNotification: (event) => received.push(event), signal: new AbortController().signal })
      .catch(() => undefined);

    expect(received).toEqual([]);
  });
});
