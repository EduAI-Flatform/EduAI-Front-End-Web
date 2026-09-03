import { describe, expect, it } from "vitest";
import {
  buildSocialOAuthStartUrl,
  getAuthErrorMessage,
  getDefaultRouteForRoles,
  getSocialOAuthErrorMessage,
} from "./auth.service";
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
    expect(getDefaultRouteForRoles(["student"])).toBe("/");
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

describe("social OAuth helpers", () => {
  it("builds a backend start URL with only safe local redirect data", () => {
    const url = new URL(
      buildSocialOAuthStartUrl("facebook", {
        mode: "register",
        role: "instructor",
        redirectTo: "/instructor/dashboard",
      }),
    );

    expect(url.pathname).toBe("/api/v1/auth/oauth/facebook/start");
    expect(url.searchParams.get("mode")).toBe("register");
    expect(url.searchParams.get("role")).toBe("instructor");
    expect(url.searchParams.get("redirectTo")).toBe("/instructor/dashboard");

    const unsafe = new URL(
      buildSocialOAuthStartUrl("zalo", {
        redirectTo: "https://evil.example",
      }),
    );
    expect(unsafe.searchParams.has("redirectTo")).toBe(false);
  });

  it("maps callback failure codes to safe user-facing messages", () => {
    expect(getSocialOAuthErrorMessage("OAUTH_PROVIDER_CANCELLED")).toBe(
      "Bạn đã hủy đăng nhập.",
    );
    expect(getSocialOAuthErrorMessage("provider-secret-detail")).toBe(
      "Không thể hoàn tất đăng nhập. Vui lòng thử lại.",
    );
  });
});
