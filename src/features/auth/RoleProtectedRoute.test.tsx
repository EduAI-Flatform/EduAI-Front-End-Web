import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleProtectedRoute } from "./RoleProtectedRoute";

const authState = vi.hoisted(() => ({
  session: null as null | { user: { roles: string[] } },
}));

vi.mock("./auth-store", () => ({
  useAuthSession: () => authState.session,
}));

function renderRoleRoute(allowedRoles: string[]) {
  render(
    <MemoryRouter initialEntries={["/restricted?tab=one"]}>
      <Routes>
        <Route element={<RoleProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/restricted" element={<h1>Nội dung được bảo vệ</h1>} />
        </Route>
        <Route path="/login" element={<h1>Đăng nhập</h1>} />
        <Route path="/dashboard" element={<h1>Bảng điều khiển học viên</h1>} />
        <Route path="/instructor/dashboard" element={<h1>Bảng điều khiển giảng viên</h1>} />
        <Route path="/admin/dashboard" element={<h1>Bảng điều khiển quản trị</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RoleProtectedRoute", () => {
  beforeEach(() => {
    authState.session = null;
  });

  it("redirects an unauthenticated visitor to login", () => {
    renderRoleRoute(["instructor"]);

    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
  });

  it("renders the protected page for an allowed role", () => {
    authState.session = { user: { roles: ["instructor"] } };

    renderRoleRoute(["instructor"]);

    expect(
      screen.getByRole("heading", { name: "Nội dung được bảo vệ" }),
    ).toBeInTheDocument();
  });

  it("redirects a student away from instructor pages", () => {
    authState.session = { user: { roles: ["student"] } };

    renderRoleRoute(["instructor"]);

    expect(
      screen.getByRole("heading", { name: "Bảng điều khiển học viên" }),
    ).toBeInTheDocument();
  });

  it("redirects an instructor away from admin pages", () => {
    authState.session = { user: { roles: ["instructor"] } };

    renderRoleRoute(["platform_admin"]);

    expect(
      screen.getByRole("heading", { name: "Bảng điều khiển giảng viên" }),
    ).toBeInTheDocument();
  });

  it("redirects a student away from admin pages", () => {
    authState.session = { user: { roles: ["student"] } };

    renderRoleRoute(["platform_admin"]);

    expect(
      screen.getByRole("heading", { name: "Bảng điều khiển học viên" }),
    ).toBeInTheDocument();
  });
});
