import { useEffect, useRef } from "react";
import type { InAppNotification } from "../../services/notification.service";
import { NotificationStreamClient } from "../../services/notification-stream.client";

interface UseNotificationStreamOptions {
  onNotification: (notification: InAppNotification) => void;
  onPoll: () => void;
}

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 10_000;
const FALLBACK_POLL_INTERVAL_MS = 30_000;

export function useNotificationStream(
  accessToken: string | undefined,
  { onNotification, onPoll }: UseNotificationStreamOptions,
): void {
  const onNotificationRef = useRef(onNotification);
  const onPollRef = useRef(onPoll);
  onNotificationRef.current = onNotification;
  onPollRef.current = onPoll;

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    const client = new NotificationStreamClient();
    let lastEventId: string | undefined;
    let retryDelay = INITIAL_RECONNECT_DELAY_MS;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackPollTimer: ReturnType<typeof setInterval> | undefined;

    const stopFallbackPolling = () => {
      if (fallbackPollTimer) clearInterval(fallbackPollTimer);
      fallbackPollTimer = undefined;
    };
    const startFallbackPolling = () => {
      if (fallbackPollTimer) return;
      onPollRef.current();
      fallbackPollTimer = setInterval(() => onPollRef.current(), FALLBACK_POLL_INTERVAL_MS);
    };
    const connect = () => {
      void client
        .connect({
          lastEventId,
          onConnected: () => {
            retryDelay = INITIAL_RECONNECT_DELAY_MS;
            stopFallbackPolling();
          },
          onNotification: (notification) => {
            lastEventId = notification.id;
            onNotificationRef.current(notification);
          },
          signal: controller.signal,
        })
        .catch(() => {
          if (controller.signal.aborted) return;

          startFallbackPolling();
          reconnectTimer = setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, MAX_RECONNECT_DELAY_MS);
        });
    };

    connect();
    return () => {
      controller.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      stopFallbackPolling();
    };
  }, [accessToken]);
}
