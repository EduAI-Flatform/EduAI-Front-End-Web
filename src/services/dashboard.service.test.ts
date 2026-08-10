import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dashboardService,
  formatLearningMinutes,
  getWeeklyActivityBars,
} from "./dashboard.service";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dashboard display mapping", () => {
  it("maps weekly minute aggregates to relative chart heights", () => {
    const bars = getWeeklyActivityBars([
      { date: "2026-07-20", minutes: 0 },
      { date: "2026-07-21", minutes: 30 },
      { date: "2026-07-22", minutes: 60 },
    ]);

    expect(bars.map(({ value }) => value)).toEqual([0, 50, 100]);
    expect(bars[2].minutes).toBe(60);
  });

  it("keeps an all-zero week deterministic", () => {
    expect(
      getWeeklyActivityBars([{ date: "2026-07-20", minutes: 0 }])[0].value,
    ).toBe(0);
  });

  it("formats completed minutes without hard-coded dashboard totals", () => {
    expect(formatLearningMinutes(145)).toBe("2 giờ 25 phút");
    expect(formatLearningMinutes(0)).toBe("0 phút");
  });

  it("loads the platform overview through the central authenticated client", async () => {
    const overview = {
      users: { total: 3, active: 3, inactive: 0, suspended: 0 },
      roles: { student: 1, instructor: 1, platformAdmin: 1 },
      courses: { total: 0, draft: 0, published: 0, archived: 0 },
      enrollments: { total: 0, active: 0, completed: 0, other: 0 },
      certificates: { issued: 0 },
      aiUsage: {
        conversations: 0,
        messages: 0,
        generatedQuizzes: 0,
        flashcards: 0,
        embeddings: 0,
      },
      classrooms: { total: 0, scheduled: 0, live: 0, ended: 0, cancelled: 0 },
      community: { posts: 0, comments: 0, reactions: 0 },
      library: { resources: 0, categories: 0, tags: 0, savedResources: 0 },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: overview, message: "OK" }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(dashboardService.getAdminOverview()).resolves.toEqual(overview);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/admin\/reports\/overview$/),
      expect.objectContaining({ method: "GET" }),
    );
  });
});
