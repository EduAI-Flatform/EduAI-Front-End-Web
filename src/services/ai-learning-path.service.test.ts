import { afterEach, describe, expect, it, vi } from "vitest";
import { aiLearningPathService } from "./ai-learning-path.service";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("aiLearningPathService", () => {
  it("loads the latest learner path through the authenticated API", async () => {
    const path = { id: "path-1", version: 2, path: { schemaVersion: "v1", milestones: [] } };
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ success: true, data: path, message: "OK" }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(aiLearningPathService.getCurrent()).resolves.toEqual(path);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/ai\/learning-paths\/current$/),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("regenerates a learner path through the authenticated API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ success: true, data: { id: "path-2", version: 3 }, message: "OK" }),
      { headers: { "Content-Type": "application/json" }, status: 201 },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await aiLearningPathService.regenerate();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/ai\/learning-paths\/regenerate$/),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
