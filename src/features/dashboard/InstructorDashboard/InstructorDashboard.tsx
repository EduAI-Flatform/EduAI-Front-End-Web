import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
  BookOpen,
  Bot,
  CalendarDays,
  House,
  LayoutDashboard,
  Library,
  Handshake,
} from "lucide-react";
import { useAuthSession } from "../../auth/auth-store";
import { ClassroomDashboard } from "../../classroom";
import { InstructorAssignmentManagementPage } from "./InstructorAssignmentManagementPage";
import { InstructorCourseManagementPage } from "./InstructorCourseManagementPage";
import { InstructorDashboardHome } from "./InstructorDashboardHome";
import { InstructorLessonManagementPage } from "./InstructorLessonManagementPage";
import { InstructorQuizManagementPage } from "./InstructorQuizManagementPage";
import { LibraryPage } from "../../library/LibraryPage";
import { ResourceUploadPage } from "../../library/ResourceUploadPage";
import { AiToolsPage } from "../../ai/AiToolsPage";
import { DashboardRouteState } from "../DashboardRouteState";
import { InstructorMentorSettingsPage } from "../../mentors/InstructorMentorSettingsPage";
import "./InstructorDashboard.css";

export const instructorSidebarItems = [
  { label: "Trang chủ", path: "/", icon: House },
  { label: "Tổng quan", path: "/instructor/dashboard", icon: LayoutDashboard },
  { label: "Khóa học", path: "/instructor/dashboard/courses", icon: BookOpen },
  { label: "Lớp trực tuyến", path: "/instructor/dashboard/classrooms", icon: CalendarDays },
  { label: "Thư viện", path: "/instructor/dashboard/library", icon: Library },
  { label: "Công cụ AI", path: "/instructor/dashboard/ai", icon: Bot },
  { label: "Mentor", path: "/instructor/dashboard/mentor", icon: Handshake },
];

type InstructorDashboardView =
  | "home"
  | "courses"
  | "lessons"
  | "quizzes"
  | "assignments"
  | "classrooms"
  | "library"
  | "library-upload"
  | "ai"
  | "mentor"
  | "unavailable";

export function getInstructorDashboardView(
  pathname: string,
): InstructorDashboardView {
  if (/^\/instructor\/dashboard\/courses\/[^/]+\/assignments(?:\/|$)/.test(pathname)) {
    return "assignments";
  }

  if (/^\/instructor\/dashboard\/courses\/[^/]+\/quizzes(?:\/|$)/.test(pathname)) {
    return "quizzes";
  }

  if (/^\/instructor\/dashboard\/courses\/[^/]+\/lessons(?:\/|$)/.test(pathname)) {
    return "lessons";
  }

  if (isDashboardSection(pathname, "classrooms")) return "classrooms";
  if (isDashboardSection(pathname, "library/upload")) return "library-upload";
  if (isDashboardSection(pathname, "library")) return "library";
  if (isDashboardSection(pathname, "ai")) return "ai";
  if (isDashboardSection(pathname, "mentor")) return "mentor";
  if (isDashboardSection(pathname, "courses")) return "courses";
  if (/^\/instructor\/dashboard\/?$/.test(pathname)) return "home";

  return "unavailable";
}

export function InstructorDashboard() {
  const session = useAuthSession();
  const location = useLocation();
  const firstName =
    session?.user.fullName?.trim().split(/\s+/).slice(-1)[0] ?? "giảng viên";
  const lessonMatch = location.pathname.match(
    /^\/instructor\/dashboard\/courses\/([^/]+)\/lessons/,
  );
  const quizMatch = location.pathname.match(
    /^\/instructor\/dashboard\/courses\/([^/]+)\/quizzes/,
  );
  const assignmentMatch = location.pathname.match(
    /^\/instructor\/dashboard\/courses\/([^/]+)\/assignments/,
  );
  const pageView = getInstructorDashboardView(location.pathname);
  let pageContent: ReactNode;

  if (pageView === "assignments" && assignmentMatch) {
    pageContent = <InstructorAssignmentManagementPage courseId={assignmentMatch[1]} />;
  } else if (pageView === "quizzes" && quizMatch) {
    pageContent = <InstructorQuizManagementPage courseId={quizMatch[1]} />;
  } else if (pageView === "lessons" && lessonMatch) {
    pageContent = <InstructorLessonManagementPage courseId={lessonMatch[1]} />;
  } else if (pageView === "classrooms") {
    pageContent = <ClassroomDashboard mode="instructor" />;
  } else if (pageView === "library-upload") {
    pageContent = <ResourceUploadPage />;
  } else if (pageView === "library") {
    pageContent = <LibraryPage />;
  } else if (pageView === "ai") {
    pageContent = <AiToolsPage />;
  } else if (pageView === "mentor") {
    pageContent = <InstructorMentorSettingsPage />;
  } else if (pageView === "courses") {
    pageContent = <InstructorCourseManagementPage />;
  } else if (pageView === "home") {
    pageContent = <InstructorDashboardHome firstName={firstName} />;
  } else {
    pageContent = <DashboardRouteState backPath="/instructor/dashboard" />;
  }

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
          {instructorSidebarItems.map((item) => {
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

function isDashboardSection(pathname: string, section: string): boolean {
  const sectionPath = `/instructor/dashboard/${section}`;
  return pathname === sectionPath || pathname.startsWith(`${sectionPath}/`);
}
