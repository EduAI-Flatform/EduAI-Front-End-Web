import { describe, expect, it } from "vitest";
import { getDefaultRouteForRoles } from "./auth.service";

describe("getDefaultRouteForRoles", () => {
  it("routes instructors to their existing dashboard", () => {
    expect(getDefaultRouteForRoles(["student", "instructor"])).toBe(
      "/instructor/dashboard",
    );
  });

  it("keeps platform administrator routing ahead of other roles", () => {
    expect(
      getDefaultRouteForRoles(["student", "instructor", "platform_admin"]),
    ).toBe("/admin/dashboard");
  });

  it("routes students to the student dashboard", () => {
    expect(getDefaultRouteForRoles(["student"])).toBe("/dashboard");
  });
});
