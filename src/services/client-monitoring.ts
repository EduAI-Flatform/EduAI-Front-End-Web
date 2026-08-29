export interface ClientErrorEvent {
  code: string;
  correlationId?: string;
  detailCode?: string;
  stage?: string;
  statusCode: number;
}

export function reportClientError(
  event: ClientErrorEvent,
  config = {
    enabled: import.meta.env.VITE_MONITORING_ENABLED === "true",
    endpoint: import.meta.env.VITE_MONITORING_ENDPOINT,
  },
): void {
  if (!config.enabled || !config.endpoint || typeof navigator.sendBeacon !== "function") return;
  navigator.sendBeacon(
    config.endpoint,
    new Blob([JSON.stringify({ ...event, occurredAt: new Date().toISOString() })], {
      type: "application/json",
    }),
  );
}
