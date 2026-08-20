import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportClientError } from "./client-monitoring";

describe("reportClientError", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("is disabled by configuration", () => {
    const beacon = vi.spyOn(navigator, "sendBeacon");
    reportClientError({ code: "ERROR", statusCode: 500 }, { enabled: false, endpoint: undefined });
    expect(beacon).not.toHaveBeenCalled();
  });

  it("sends a sanitized correlation event when enabled", () => {
    const beacon = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    reportClientError(
      { code: "ERROR", correlationId: "request-12345678", statusCode: 500 },
      { enabled: true, endpoint: "https://monitor.example/events" },
    );
    expect(beacon).toHaveBeenCalledWith("https://monitor.example/events", expect.any(Blob));
  });
});
