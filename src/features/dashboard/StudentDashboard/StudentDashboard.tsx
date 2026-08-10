import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuthSession } from "../../auth/auth-store";
import { ClassroomDashboard } from "../../classroom";
import { MyLearningPage } from "./MyLearningPage";
import { LibraryPage } from "../../library/LibraryPage";
import { StudentDashboardHome } from "./StudentDashboardHome";
import { StudentProfilePage } from "./StudentProfilePage";
import { StudentSidebar } from "./StudentSidebar";
import { AiChatPage } from "../../ai/AiChatPage";
import { AiToolsPage } from "../../ai/AiToolsPage";
import { CertificatesPage } from "../../certificates/CertificatesPage";
import { CommunityPage } from "../../community/CommunityPage";
import { DashboardRouteState } from "../DashboardRouteState";
import "./StudentDashboard.css";

type StudentDashboardView =
  | "home"
  | "learning"
  | "classrooms"
  | "library"
  | "community"
  | "profile"
  | "ai"
  | "ai-tools"
  | "certificates"
  | "unavailable";

export function getStudentDashboardView(pathname: string): StudentDashboardView {
  if (/^\/dashboard\/?$/.test(pathname)) return "home";
  if (pathname === "/dashboard/learning") return "learning";
  if (pathname === "/dashboard/classrooms") return "classrooms";
  if (pathname === "/dashboard/library") return "library";
  if (pathname === "/dashboard/community") return "community";
  if (pathname === "/dashboard/profile") return "profile";
  if (pathname === "/dashboard/ai/tools") return "ai-tools";
  if (pathname === "/dashboard/ai") return "ai";
  if (pathname === "/dashboard/certificates") return "certificates";

  return "unavailable";
}

export function StudentDashboard() {
  const session = useAuthSession();
  const location = useLocation();
  const firstName =
    session?.user.fullName?.trim().split(/\s+/).slice(-1)[0] ?? "bạn";
  const pageView = getStudentDashboardView(location.pathname);
  let pageContent: ReactNode;

  if (pageView === "learning") {
    pageContent = <MyLearningPage />;
  } else if (pageView === "classrooms") {
    pageContent = <ClassroomDashboard mode="student" />;
  } else if (pageView === "library") {
    pageContent = <LibraryPage />;
  } else if (pageView === "community") {
    pageContent = <CommunityPage />;
  } else if (pageView === "profile") {
    pageContent = <StudentProfilePage />;
  } else if (pageView === "ai-tools") {
    pageContent = <AiToolsPage />;
  } else if (pageView === "ai") {
    pageContent = <AiChatPage />;
  } else if (pageView === "certificates") {
    pageContent = <CertificatesPage />;
  } else if (pageView === "home") {
    pageContent = <StudentDashboardHome firstName={firstName} />;
  } else {
    pageContent = <DashboardRouteState backPath="/dashboard" />;
  }

  return (
    <section className="student-dashboard">
      <StudentSidebar />
      <main className="student-dashboard__content">{pageContent}</main>
    </section>
  );
}
