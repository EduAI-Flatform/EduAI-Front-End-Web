import type { ReactNode } from "react";
import { House, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "../../auth/auth-store";
import { DashboardRouteState } from "../DashboardRouteState";
import { AdminDashboardHome } from "./AdminDashboardHome";
import "./AdminDashboard.css";

export const adminSidebarItems = [
  { label: "Trang chủ", path: "/", icon: House },
  { label: "Tổng quan", path: "/admin/dashboard", icon: LayoutDashboard },
];

export type AdminDashboardView = "home" | "unavailable";

export function getAdminDashboardView(pathname: string): AdminDashboardView {
  return /^\/admin\/dashboard\/?$/.test(pathname) ? "home" : "unavailable";
}

export function AdminDashboard() {
  const session = useAuthSession();
  const location = useLocation();

  if (!session?.user.roles.includes("platform_admin")) {
    return <Navigate replace to="/dashboard" />;
  }

  const pageView = getAdminDashboardView(location.pathname);
  let pageContent: ReactNode;

  if (pageView === "home") {
    pageContent = <AdminDashboardHome fullName={session.user.fullName} />;
  } else {
    pageContent = <DashboardRouteState backPath="/admin/dashboard" />;
  }

  return (
    <section className="admin-dashboard">
      <aside className="admin-dashboard__sidebar" aria-label="Điều hướng quản trị">
        <Link className="admin-dashboard__brand" to="/">
          <span className="admin-dashboard__brand-mark" aria-hidden="true">
            E
          </span>
          <span>
            <strong>EduAI</strong>
            <small>Cổng quản trị</small>
          </span>
        </Link>

        <nav className="admin-dashboard__nav">
          {adminSidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === "/admin/dashboard" && pageView === "home";

            return (
              <Link
                className={
                  isActive
                    ? "admin-dashboard__nav-link admin-dashboard__nav-link--active"
                    : "admin-dashboard__nav-link"
                }
                key={item.path}
                to={item.path}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-dashboard__identity">
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>{session.user.fullName}</strong>
            <small>Quản trị viên nền tảng</small>
          </span>
        </div>
      </aside>

      <main className="admin-dashboard__content">{pageContent}</main>
    </section>
  );
}
