import { Link, Navigate, useLocation } from "react-router-dom";
import {
  Award,
  BookOpen,
  Bot,
  CalendarDays,
  ClipboardCheck,
  House,
  LayoutDashboard,
  Library,
  Settings,
  Users,
} from "lucide-react";
import { useAuthSession } from "../../auth/auth-store";
import { InstructorCourseManagementPage } from "./InstructorCourseManagementPage";
import { InstructorDashboardHome } from "./InstructorDashboardHome";
import { InstructorLessonManagementPage } from "./InstructorLessonManagementPage";
import "./InstructorDashboard.css";

const sidebarItems = [
  { label: "Trang chủ", path: "/", icon: House },
  { label: "Tổng quan", path: "/instructor/dashboard", icon: LayoutDashboard },
  { label: "Khóa học", path: "/instructor/dashboard/courses", icon: BookOpen },
  { label: "Học viên", path: "/instructor/dashboard/students", icon: Users },
  { label: "Lớp trực tuyến", path: "/instructor/dashboard/classrooms", icon: CalendarDays },
  { label: "Bài tập", path: "/instructor/dashboard/assignments", icon: ClipboardCheck },
  { label: "Thư viện", path: "/instructor/dashboard/library", icon: Library },
  { label: "Trợ lý AI", path: "/instructor/dashboard/ai", icon: Bot },
  { label: "Chứng chỉ", path: "/instructor/dashboard/certificates", icon: Award },
  { label: "Cài đặt", path: "/instructor/dashboard/settings", icon: Settings },
];

export function InstructorDashboard() {
  const session = useAuthSession();
  const location = useLocation();
  const firstName =
    session?.user.fullName?.trim().split(/\s+/).slice(-1)[0] ?? "giảng viên";
  const lessonMatch = location.pathname.match(
    /^\/instructor\/dashboard\/courses\/([^/]+)\/lessons/,
  );
  const pageContent = lessonMatch ? (
    <InstructorLessonManagementPage courseId={lessonMatch[1]} />
  ) : location.pathname.startsWith("/instructor/dashboard/courses") ? (
    <InstructorCourseManagementPage />
  ) : (
    <InstructorDashboardHome firstName={firstName} />
  );

  if (!session?.user.roles.includes("instructor")) {
    return <Navigate replace to="/dashboard" />;
  }

  return (
    <section className="instructor-dashboard">
      <aside className="instructor-sidebar" aria-label="Điều hướng giảng viên">
        <Link className="instructor-sidebar__brand" to="/">
          <span className="instructor-sidebar__logo">E</span>
          <div>
            <h2>EduAI</h2>
            <p>Cổng giảng viên</p>
          </div>
        </Link>
        <nav className="instructor-sidebar__nav">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === "/"
                ? false
                : location.pathname === item.path ||
                  (item.path !== "/instructor/dashboard" &&
                    location.pathname.startsWith(item.path));

            return (
              <Link
                className={
                  isActive
                    ? "instructor-sidebar__link instructor-sidebar__link--active"
                    : "instructor-sidebar__link"
                }
                key={item.label}
                to={item.path}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="instructor-sidebar__assistant">
          <span>AI Studio</span>
          <p>Tạo dàn ý bài học, quiz và gợi ý cải thiện khóa học.</p>
        </div>
      </aside>
      <main className="instructor-dashboard__content">{pageContent}</main>
    </section>
  );
}
