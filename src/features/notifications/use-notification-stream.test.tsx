import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNotificationStream } from "./use-notification-stream";

const connect = vi.hoisted(() => vi.fn());

vi.mock("../../services/notification-stream.client", () => ({
  NotificationStreamClient: class {
    connect = connect;
  },
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("useNotificationStream", () => {
  it("falls back to polling after a stream failure and cleans it up on unmount", async () => {
    vi.useFakeTimers();
    connect
      .mockRejectedValueOnce(new Error("stream unavailable"))
      .mockImplementation(() => new Promise<void>(() => undefined));
    const onPoll = vi.fn();
    const { unmount } = renderHook(() =>
      useNotificationStream("access-token", { onNotification: vi.fn(), onPoll }),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(onPoll).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(onPoll).toHaveBeenCalledTimes(2);

    unmount();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(onPoll).toHaveBeenCalledTimes(2);
  });
});
