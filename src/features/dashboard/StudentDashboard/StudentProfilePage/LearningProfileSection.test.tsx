import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LearningProfileSection } from "./LearningProfileSection";

describe("LearningProfileSection", () => {
  it("saves multiple normalized skill goals", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <LearningProfileSection
        isLoading={false}
        onSave={onSave}
        profile={null}
      />,
    );

    await user.type(screen.getByLabelText("Mục tiêu học tập"), "Hoàn thành lộ trình AI");
    await user.type(screen.getByLabelText("Kỹ năng muốn phát triển 1"), "Python");
    await user.click(screen.getByRole("button", { name: "Thêm kỹ năng" }));
    await user.type(screen.getByLabelText("Kỹ năng muốn phát triển 2"), "Machine learning");
    await user.click(screen.getByRole("button", { name: "Lưu định hướng" }));

    expect(onSave).toHaveBeenCalledWith({
      learningGoal: "Hoàn thành lộ trình AI",
      currentLevel: null,
      weeklyAvailabilityHours: null,
      skillGaps: [
        { name: "Python", currentLevel: null, targetLevel: "intermediate" },
        { name: "Machine learning", currentLevel: null, targetLevel: "intermediate" },
      ],
    });
  });

  it("keeps the save action disabled while profile data loads", () => {
    render(
      <LearningProfileSection
        isLoading
        onSave={vi.fn()}
        profile={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Lưu định hướng" })).toBeDisabled();
  });
});
