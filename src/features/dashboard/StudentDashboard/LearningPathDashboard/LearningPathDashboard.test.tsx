import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiLearningPathService } from "../../../../services/ai-learning-path.service";
import { LearningPathDashboard } from "./LearningPathDashboard";

vi.mock("../../../../services/ai-learning-path.service", () => ({
  aiLearningPathService: {
    getCurrent: vi.fn(),
    regenerate: vi.fn(),
  },
  getLearningPathErrorMessage: () => "Không thể tải lộ trình.",
}));

const currentPath = {
  id: "path-1",
  version: 4,
  createdAt: "2026-08-20T00:00:00.000Z",
  path: {
    schemaVersion: "v1" as const,
    milestones: [
      {
        courseId: "course-1",
        reason: "Xây nền tảng trước khi thực hành.",
        priority: 1,
        available: true,
        course: {
          id: "course-1",
          title: "Nhập môn Trí tuệ nhân tạo",
          slug: "nhap-mon-ai",
          thumbnailUrl: null,
          level: "beginner",
          progressPercent: 35,
          enrollmentStatus: "active",
        },
      },
      {
        courseId: "course-2",
        reason: "Khóa học đã thay đổi quyền truy cập.",
        priority: 2,
        available: false,
        course: null,
      },
    ],
  },
};

describe("LearningPathDashboard", () => {
  beforeEach(() => {
    vi.mocked(aiLearningPathService.getCurrent).mockReset();
    vi.mocked(aiLearningPathService.regenerate).mockReset();
  });

  it("renders progress and keeps unavailable recommendations non-navigable", async () => {
    vi.mocked(aiLearningPathService.getCurrent).mockResolvedValue(currentPath);
    render(<MemoryRouter><LearningPathDashboard /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Lộ trình học tập AI" })).toBeInTheDocument();
    expect(screen.getByText("Nhập môn Trí tuệ nhân tạo")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Tiến độ Nhập môn Trí tuệ nhân tạo" })).toHaveAttribute("aria-valuenow", "35");
    expect(screen.getByRole("link", { name: "Tiếp tục học Nhập môn Trí tuệ nhân tạo" })).toHaveAttribute("href", "/learning/course-1");
    expect(screen.getByText("Khuyến nghị không còn khả dụng")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Khuyến nghị không còn khả dụng/ })).not.toBeInTheDocument();
  });

  it("regenerates and reloads the enriched current path", async () => {
    const user = userEvent.setup();
    vi.mocked(aiLearningPathService.getCurrent)
      .mockResolvedValueOnce(currentPath)
      .mockResolvedValueOnce({ ...currentPath, version: 5 });
    vi.mocked(aiLearningPathService.regenerate).mockResolvedValue({ id: "path-2", version: 5, path: currentPath.path });
    render(<MemoryRouter><LearningPathDashboard /></MemoryRouter>);

    await user.click(await screen.findByRole("button", { name: "Tạo lại lộ trình" }));
    await waitFor(() => expect(aiLearningPathService.regenerate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(aiLearningPathService.getCurrent).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Phiên bản 5")).toBeInTheDocument();
  });

  it("offers goal editing and generation when no path exists", async () => {
    vi.mocked(aiLearningPathService.getCurrent).mockResolvedValue(null);
    render(<MemoryRouter><LearningPathDashboard /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Bắt đầu từ mục tiêu của bạn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chỉnh mục tiêu học tập" })).toHaveAttribute("href", "/dashboard/profile");
    expect(screen.getByRole("button", { name: "Tạo lộ trình đầu tiên" })).toBeEnabled();
  });
});
