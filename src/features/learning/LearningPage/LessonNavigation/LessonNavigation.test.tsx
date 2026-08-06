import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LessonNavigation } from "./LessonNavigation";

const steps = Array.from({ length: 5 }, (_, index) => ({
  id: `step-${index + 1}`,
  type: "LESSON" as const,
  title: `Bài học ${index + 1}`,
  position: index + 1,
  status: index === 0 ? ("COMPLETED" as const) : ("AVAILABLE" as const),
  lockedReason: null,
  progressPercent: index === 0 ? 100 : 0,
}));

describe("LessonNavigation", () => {
  it("renders Stitch-like course structure with collapsible sections", () => {
    render(
      <LessonNavigation
        completedSteps={1}
        onSelectStep={vi.fn()}
        progressPercent={20}
        selectedStepId="step-2"
        steps={steps}
        totalSteps={5}
      />,
    );

    expect(screen.getByText("Cấu trúc khóa học")).toBeInTheDocument();
    expect(screen.getByText("Đã hoàn thành 1/5 bài học")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Chương 1/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Bài học 2")).toBeVisible();
    expect(screen.queryByText("Bài học 5")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Chương 2/i }));

    expect(screen.getByText("Bài học 5")).toBeVisible();
  });
});
