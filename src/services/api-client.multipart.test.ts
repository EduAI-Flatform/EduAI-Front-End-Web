import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiClientError } from "./api-client";

describe("ApiClient multipart requests", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not set Content-Type for FormData so the browser supplies the boundary", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: true }, message: "ok" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    const formData = new FormData();
    formData.set("file", new File(["data"], "file.pdf"));

    await new ApiClient({ baseUrl: "/api/v1" }).post("/upload", formData);

    const options = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(options?.headers).has("Content-Type")).toBe(false);
    expect(options?.body).toBe(formData);
  });

  it("carries the backend correlation id into the user-facing error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: "INTERNAL_SERVER_ERROR", message: "Yêu cầu thất bại" },
          correlationId: "request-12345678",
        }),
        { headers: { "Content-Type": "application/json" }, status: 500 },
      ),
    );

    await expect(new ApiClient({ baseUrl: "/api/v1" }).get("/failure")).rejects.toMatchObject({
      correlationId: "request-12345678",
      message: "Yêu cầu thất bại (Mã lỗi: request-12345678)",
    } satisfies Partial<ApiClientError>);
  });
});
