import { Link, Navigate } from "react-router-dom";
import { BookOpen, House, LayoutDashboard } from "lucide-react";
import { useAuthSession } from "../../auth/auth-store";
import { InstructorCourseManagementPage } from "./InstructorCourseManagementPage";
import "./InstructorDashboard.css";

export function InstructorDashboard() {
  const session = useAuthSession();

  if (!session?.user.roles.includes("instructor")) {
    return <Navigate replace to="/dashboard" />;
  }

  return (
    <section className="instructor-dashboard">
      <aside className="instructor-sidebar" aria-label="Điều hướng giảng viên">
        <Link className="instructor-sidebar__brand" to="/">
          <h2>EduAI</h2>
          <p>Cổng giảng viên</p>
        </Link>
        <nav className="instructor-sidebar__nav">
          <Link className="instructor-sidebar__link" to="/">
            <House aria-hidden="true" />
            <span>Trang chủ</span>
          </Link>
          <Link
            className="instructor-sidebar__link instructor-sidebar__link--active"
            to="/instructor/dashboard"
          >
            <LayoutDashboard aria-hidden="true" />
            <span>Bảng điều khiển</span>
          </Link>
          <Link className="instructor-sidebar__link" to="/instructor/dashboard">
            <BookOpen aria-hidden="true" />
            <span>Khóa học</span>
          </Link>
        </nav>
      </aside>
      <main className="instructor-dashboard__content">
        <InstructorCourseManagementPage />
      </main>
    </section>
  );
}
