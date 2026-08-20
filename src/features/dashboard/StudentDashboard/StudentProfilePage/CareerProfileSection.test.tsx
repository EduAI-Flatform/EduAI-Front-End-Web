import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CareerProfileSection } from "./CareerProfileSection";

describe("CareerProfileSection", () => {
  it("saves normalized preferences and visibility", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<CareerProfileSection isLoading={false} profile={null} onSave={onSave} />);

    await user.type(screen.getByLabelText("Vai trò mong muốn"), "Backend Engineer, AI Engineer");
    await user.click(screen.getByLabelText("Làm việc từ xa"));
    await user.type(screen.getByLabelText("Đường dẫn hồ sơ công khai"), "nguyen-van-an");
    await user.click(screen.getByLabelText("Công khai hồ sơ nghề nghiệp"));
    await user.click(screen.getByRole("button", { name: "Lưu hồ sơ nghề nghiệp" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      preferredRoles: ["Backend Engineer", "AI Engineer"],
      preferredWorkModes: ["remote"],
      publicSlug: "nguyen-van-an",
      isPublic: true,
    }));
  });

  it("shows read-only completion and certificate projections", () => {
    render(<CareerProfileSection isLoading={false} onSave={vi.fn()} profile={{
      fullName: "Nguyễn Văn An", avatarUrl: null, bio: null, headline: null,
      location: null, websiteUrl: null, email: "an@example.com", publicSlug: null,
      isPublic: false, careerGoal: null, preferredRoles: [], preferredWorkModes: [],
      availabilityStatus: null, availableFrom: null, skills: [], portfolio: [],
      completedCourses: [{ title: "AI cơ bản", slug: "ai", thumbnailUrl: null, completedAt: "2026-08-01" }],
      certificates: [{ title: "Chứng chỉ AI", courseTitle: "AI cơ bản", courseSlug: "ai", issuedAt: "2026-08-02", verificationUrl: null }],
    }} />);

    expect(screen.getByText("1 khóa học hoàn thành")).toBeInTheDocument();
    expect(screen.getByText("1 chứng chỉ")).toBeInTheDocument();
  });
});
