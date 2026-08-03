import { describe, expect, it } from "vitest";
import {
  formatLearningMinutes,
  getWeeklyActivityBars,
} from "./dashboard.service";

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
});
