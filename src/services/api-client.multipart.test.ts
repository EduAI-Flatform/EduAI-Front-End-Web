import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "./api-client";

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
});
