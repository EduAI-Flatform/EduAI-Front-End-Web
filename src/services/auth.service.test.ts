import { describe, expect, it } from "vitest";
import { getAuthErrorMessage, getDefaultRouteForRoles } from "./auth.service";
import { ApiClientError } from "./api-client";

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

describe("getAuthErrorMessage", () => {
  it("maps Firebase email errors to Vietnamese messages", () => {
    expect(getAuthErrorMessage({ code: "auth/invalid-credential" })).toBe(
      "Email hoặc mật khẩu không đúng.",
    );
    expect(getAuthErrorMessage({ code: "auth/email-already-in-use" })).toBe(
      "Email này đã được sử dụng.",
    );
  });

  it("maps backend Firebase auth codes to Vietnamese messages", () => {
    expect(
      getAuthErrorMessage(
        new ApiClientError(
          "ignored",
          "ACCOUNT_LINK_CONFLICT",
          409,
        ),
      ),
    ).toBe("Email này đã được liên kết với tài khoản khác.");
  });
});
