import { describe, expect, it } from "vitest";
import { getNotificationDestination } from "./notification-destination";

describe("getNotificationDestination", () => {
  it("keeps supported internal notification destinations", () => {
    expect(getNotificationDestination("/dashboard/learning")).toBe(
      "/dashboard/learning",
    );
    expect(getNotificationDestination("/courses/course-123")).toBe(
      "/courses/course-123",
    );
  });

  it("rejects missing, external, and unsupported destinations", () => {
    expect(getNotificationDestination(null)).toBeNull();
    expect(getNotificationDestination("https://example.test/redirect")).toBeNull();
    expect(getNotificationDestination("//example.test/redirect")).toBeNull();
    expect(getNotificationDestination("/settings/billing")).toBeNull();
  });
});
