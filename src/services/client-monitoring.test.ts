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

  it("sends a sanitized correlation event when enabled", async () => {
    const beacon = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    reportClientError(
      {
        code: "GOOGLE_OAUTH_CALLBACK_FAILED",
        correlationId: "request-12345678",
        detailCode: "auth/no-auth-event",
        stage: "callback",
        statusCode: 0,
      },
      { enabled: true, endpoint: "https://monitor.example/events" },
    );
    expect(beacon).toHaveBeenCalledWith("https://monitor.example/events", expect.any(Blob));
    const payload = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(beacon.mock.calls[0][1] as Blob);
    });
    expect(JSON.parse(payload)).toMatchObject({
      code: "GOOGLE_OAUTH_CALLBACK_FAILED",
      correlationId: "request-12345678",
      detailCode: "auth/no-auth-event",
      stage: "callback",
      statusCode: 0,
    });
    expect(payload).not.toMatch(/accessToken|refreshToken|clientSecret|idToken/);
  });
});
