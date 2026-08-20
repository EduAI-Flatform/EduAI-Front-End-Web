import type { ReactNode } from "react";
import {
  House,
  LayoutDashboard,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
  Ticket,
  Coins,
  BriefcaseBusiness,
} from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "../../auth/auth-store";
import { DashboardRouteState } from "../DashboardRouteState";
import { AdminDashboardHome } from "./AdminDashboardHome";
import { AdminAuditLogPage } from "./AdminAuditLogPage";
import { AdminModerationPage } from "./AdminModerationPage";
import { AdminUserManagementPage } from "./AdminUserManagementPage";
import { AdminVoucherManagementPage } from "./AdminVoucherManagementPage";
import { AdminScholarshipManagementPage } from "./AdminScholarshipManagementPage";
import { AdminTmiManagementPage } from "./AdminTmiManagementPage";
import { AdminJobManagementPage } from "./AdminJobManagementPage";
import { AdminJobApplicationsPage } from "../../jobs/AdminJobApplicationsPage";
import { AdminMentorApprovalPage } from "../../mentors/AdminMentorApprovalPage";
import "./AdminDashboard.css";

export const adminSidebarItems = [
  { label: "Trang chủ", path: "/", icon: House },
  { label: "Tổng quan", path: "/admin/dashboard", icon: LayoutDashboard },
  {
    label: "Nhật ký",
    path: "/admin/dashboard/audit-logs",
    icon: ScrollText,
  },
  {
    label: "Tài khoản",
    path: "/admin/dashboard/users",
    icon: UsersRound,
  },
  {
    label: "Kiểm duyệt",
    path: "/admin/dashboard/moderation",
    icon: ShieldAlert,
  },
  {
    label: "Voucher",
    path: "/admin/dashboard/vouchers",
    icon: Ticket,
  },
  {
    label: "Học bổng",
    path: "/admin/dashboard/scholarships",
    icon: Ticket,
  },
  { label: "TMI Rewards", path: "/admin/dashboard/tmi", icon: Coins },
  { label: "Việc làm", path: "/admin/dashboard/jobs", icon: BriefcaseBusiness },
  { label: "Hồ sơ ứng tuyển", path: "/admin/dashboard/job-applications", icon: BriefcaseBusiness },
  { label: "Cố vấn", path: "/admin/dashboard/mentors", icon: UsersRound },
];

export type AdminDashboardView =
  | "home"
  | "users"
  | "audit-logs"
  | "moderation"
  | "vouchers"
  | "scholarships"
  | "tmi"
  | "jobs"
  | "job-applications"
  | "mentors"
  | "unavailable";

export function getAdminDashboardView(pathname: string): AdminDashboardView {
  if (/^\/admin\/dashboard\/?$/.test(pathname)) return "home";
  if (/^\/admin\/dashboard\/users\/?$/.test(pathname)) return "users";
  if (/^\/admin\/dashboard\/audit-logs\/?$/.test(pathname)) {
    return "audit-logs";
  }
  if (/^\/admin\/dashboard\/moderation\/?$/.test(pathname)) {
    return "moderation";
  }
  if (/^\/admin\/dashboard\/vouchers\/?$/.test(pathname)) {
    return "vouchers";
  }
  if (/^\/admin\/dashboard\/scholarships\/?$/.test(pathname)) {
    return "scholarships";
  }
  if (/^\/admin\/dashboard\/tmi\/?$/.test(pathname)) {
    return "tmi";
  }
  if (/^\/admin\/dashboard\/jobs\/?$/.test(pathname)) return "jobs";
  if (/^\/admin\/dashboard\/job-applications\/?$/.test(pathname)) return "job-applications";
  if (/^\/admin\/dashboard\/mentors\/?$/.test(pathname)) return "mentors";
  return "unavailable";
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
  } else if (pageView === "users") {
    pageContent = <AdminUserManagementPage />;
  } else if (pageView === "audit-logs") {
    pageContent = <AdminAuditLogPage />;
  } else if (pageView === "moderation") {
    pageContent = <AdminModerationPage />;
  } else if (pageView === "vouchers") {
    pageContent = <AdminVoucherManagementPage />;
  } else if (pageView === "scholarships") {
    pageContent = <AdminScholarshipManagementPage />;
  } else if (pageView === "tmi") {
    pageContent = <AdminTmiManagementPage />;
  } else if (pageView === "jobs") {
    pageContent = <AdminJobManagementPage />;
  } else if (pageView === "job-applications") {
    pageContent = <AdminJobApplicationsPage />;
  } else if (pageView === "mentors") {
    pageContent = <AdminMentorApprovalPage />;
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
              (item.path === "/admin/dashboard" && pageView === "home") ||
              (item.path === "/admin/dashboard/users" &&
                pageView === "users") ||
              (item.path === "/admin/dashboard/audit-logs" &&
                pageView === "audit-logs") ||
              (item.path === "/admin/dashboard/moderation" &&
                pageView === "moderation") ||
              (item.path === "/admin/dashboard/vouchers" &&
                pageView === "vouchers") ||
              (item.path === "/admin/dashboard/scholarships" &&
                pageView === "scholarships") ||
              (item.path === "/admin/dashboard/tmi" && pageView === "tmi") ||
              (item.path === "/admin/dashboard/jobs" && pageView === "jobs");
            const navActive = isActive || (item.path === "/admin/dashboard/job-applications" && pageView === "job-applications") || (item.path === "/admin/dashboard/mentors" && pageView === "mentors");

            return (
              <Link
                className={
                  navActive
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
