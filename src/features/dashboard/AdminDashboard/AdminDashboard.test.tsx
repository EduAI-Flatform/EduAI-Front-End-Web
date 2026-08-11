import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "./AdminDashboard";

const dashboardApi = vi.hoisted(() => ({
  getAdminOverview: vi.fn(),
}));

vi.mock("../../../services/dashboard.service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../../services/dashboard.service")
  >();

  return {
    ...actual,
    dashboardService: {
      ...actual.dashboardService,
      getAdminOverview: dashboardApi.getAdminOverview,
    },
  };
});

vi.mock("../../auth/auth-store", () => ({
  useAuthSession: () => ({
    user: {
      fullName: "Quản trị Demo",
      roles: ["platform_admin"],
    },
  }),
}));

const overview = {
  users: { total: 42, active: 37, inactive: 3, suspended: 2 },
  roles: { student: 34, instructor: 7, platformAdmin: 1 },
  courses: { total: 12, draft: 3, published: 8, archived: 1 },
  enrollments: { total: 91, active: 64, completed: 24, other: 3 },
  certificates: { issued: 18 },
  aiUsage: {
    conversations: 15,
    messages: 74,
    generatedQuizzes: 6,
    flashcards: 23,
    embeddings: 128,
  },
  classrooms: { total: 9, scheduled: 4, live: 1, ended: 3, cancelled: 1 },
  community: { posts: 21, comments: 55, reactions: 89 },
  library: { resources: 31, categories: 5, tags: 14, savedResources: 47 },
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <AdminDashboard />
    </MemoryRouter>,
  );
}

describe("AdminDashboard", () => {
  beforeEach(() => {
    dashboardApi.getAdminOverview.mockReset();
  });

  it("renders a dedicated dashboard from live aggregate data", async () => {
    dashboardApi.getAdminOverview.mockResolvedValue(overview);

    renderDashboard();

    expect(
      await screen.findByRole("heading", { name: "Tổng quan nền tảng" }),
    ).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(
      within(screen.getByRole("main")).getByText("Tài khoản"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 tài khoản bị tạm ngưng")).toBeInTheDocument();
    expect(screen.queryByText(/Sprint 14/i)).not.toBeInTheDocument();
  });

  it("shows a responsive loading state while the overview is pending", () => {
    dashboardApi.getAdminOverview.mockReturnValue(new Promise(() => undefined));

    renderDashboard();

    expect(
      screen.getByLabelText("Đang tải tổng quan quản trị"),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("shows an explicit all-clear state when operational counts are zero", async () => {
    dashboardApi.getAdminOverview.mockResolvedValue({
      ...overview,
      users: { ...overview.users, inactive: 0, suspended: 0 },
      courses: { ...overview.courses, draft: 0 },
      classrooms: { ...overview.classrooms, scheduled: 0, live: 0 },
    });

    renderDashboard();

    expect(
      await screen.findByText("Không có chỉ số vận hành nào cần chú ý."),
    ).toHaveAttribute("role", "status");
  });

  it("retries after an API error", async () => {
    dashboardApi.getAdminOverview
      .mockRejectedValueOnce(new Error("Không thể kết nối API"))
      .mockResolvedValueOnce(overview);
    const user = userEvent.setup();

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể kết nối API",
    );
    await user.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(
      await screen.findByRole("heading", { name: "Tổng quan nền tảng" }),
    ).toBeInTheDocument();
    expect(dashboardApi.getAdminOverview).toHaveBeenCalledTimes(2);
  });
});
