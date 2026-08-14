import { getApiBaseUrl } from "./api-client";
import { getAuthSession } from "./auth.service";
import type { InAppNotification } from "./notification.service";

export interface NotificationStreamConnectionOptions {
  lastEventId?: string;
  onConnected?: () => void;
  onNotification: (notification: InAppNotification) => void;
  signal: AbortSignal;
}

export class NotificationStreamClient {
  async connect(options: NotificationStreamConnectionOptions): Promise<void> {
    const accessToken = getAuthSession()?.accessToken;
    if (!accessToken) throw new Error("Notification stream requires an authenticated session.");

    const response = await fetch(`${getApiBaseUrl().replace(/\/+$/, "")}/notifications/stream`, {
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${accessToken}`,
        ...(options.lastEventId ? { "Last-Event-ID": options.lastEventId } : {}),
      },
      signal: options.signal,
    });

    if (!response.ok || !response.body || !response.headers.get("Content-Type")?.includes("text/event-stream")) {
      throw new Error("Notification stream is unavailable.");
    }

    options.onConnected?.();
    await consumeEventStream(response.body, options.onNotification);

    if (!options.signal.aborted) throw new Error("Notification stream closed.");
  }
}

async function consumeEventStream(
  stream: ReadableStream<Uint8Array>,
  onNotification: (notification: InAppNotification) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      blocks.forEach((block) => processEventBlock(block, onNotification));
    }

    buffer += decoder.decode().replace(/\r\n/g, "\n");
    if (buffer) processEventBlock(buffer, onNotification);
  } finally {
    reader.releaseLock();
  }
}

function processEventBlock(
  block: string,
  onNotification: (notification: InAppNotification) => void,
): void {
  const fields = block.split("\n").reduce<Record<string, string[]>>((result, line) => {
    if (!line || line.startsWith(":")) return result;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) return result;

    const name = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1).replace(/^ /, "");
    result[name] = [...(result[name] ?? []), value];
    return result;
  }, {});

  if (fields.event?.[0] !== "notification" || !fields.data?.length) return;

  try {
    const notification = toNotification(fields.data.join("\n"));
    if (!notification || (fields.id?.[0] && fields.id[0] !== notification.id)) return;
    onNotification(notification);
  } catch {
    // Ignore a malformed stream event; normal notification APIs remain available.
  }
}

function toNotification(data: string): InAppNotification | undefined {
  const value = JSON.parse(data) as Partial<InAppNotification>;
  if (
    typeof value.id !== "string" ||
    typeof value.type !== "string" ||
    typeof value.category !== "string" ||
    typeof value.title !== "string" ||
    typeof value.body !== "string" ||
    (typeof value.link !== "string" && value.link !== null) ||
    typeof value.isRead !== "boolean" ||
    (typeof value.readAt !== "string" && value.readAt !== null) ||
    typeof value.createdAt !== "string"
  ) {
    return undefined;
  }

  return value as InAppNotification;
}
