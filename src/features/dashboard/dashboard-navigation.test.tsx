import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Header from "../../components/layout/header";
import {
  adminSidebarItems,
  getAdminDashboardView,
} from "./AdminDashboard/AdminDashboard";
import {
  getInstructorDashboardView,
  instructorSidebarItems,
} from "./InstructorDashboard/InstructorDashboard";
import {
  getStudentDashboardView,
} from "./StudentDashboard/StudentDashboard";
import { StudentSidebar } from "./StudentDashboard/StudentSidebar";

vi.mock("../auth/auth-store", () => ({
  clearAuthSession: vi.fn(),
  useAuthSession: () => ({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    user: {
      email: "student@example.com",
      fullName: "Học viên Demo",
      roles: ["student"],
    },
  }),
}));

describe("dashboard navigation integrity", () => {
  it("exposes only implemented administrator destinations", () => {
    expect(adminSidebarItems.map(({ path }) => path)).toEqual([
      "/",
      "/admin/dashboard",
      "/admin/dashboard/audit-logs",
      "/admin/dashboard/users",
      "/admin/dashboard/moderation",
    ]);
    expect(getAdminDashboardView("/admin/dashboard")).toBe("home");
    expect(getAdminDashboardView("/admin/dashboard/audit-logs")).toBe(
      "audit-logs",
    );
    expect(getAdminDashboardView("/admin/dashboard/users")).toBe("users");
    expect(getAdminDashboardView("/admin/dashboard/moderation")).toBe(
      "moderation",
    );
  });

  it("does not expose unsupported instructor destinations", () => {
    expect(instructorSidebarItems.map(({ path }) => path)).toEqual([
      "/",
      "/instructor/dashboard",
      "/instructor/dashboard/courses",
      "/instructor/dashboard/classrooms",
      "/instructor/dashboard/library",
      "/instructor/dashboard/ai",
    ]);
  });

  it("resolves unknown instructor destinations to an explicit unavailable state", () => {
    expect(getInstructorDashboardView("/instructor/dashboard/settings")).toBe(
      "unavailable",
    );
    expect(getInstructorDashboardView("/instructor/dashboard")).toBe("home");
  });

  it("resolves unknown student destinations to an explicit unavailable state", () => {
    expect(getStudentDashboardView("/dashboard/not-a-page")).toBe("unavailable");
    expect(getStudentDashboardView("/dashboard")).toBe("home");
  });

  it("hides the dead pricing destination from global and student navigation", () => {
    const { unmount } = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.queryAllByRole("link", { name: "Bảng giá" })).toHaveLength(0);
    unmount();

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <StudentSidebar />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: "Nâng cấp Pro" })).not.toBeInTheDocument();
  });
});
