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
import "./StudentDashboard.css";

export function StudentDashboard() {
  const session = useAuthSession();
  const location = useLocation();
  const firstName =
    session?.user.fullName?.trim().split(/\s+/).slice(-1)[0] ?? "bạn";
  let pageContent = <StudentDashboardHome firstName={firstName} />;

  if (location.pathname.endsWith("/learning")) {
    pageContent = <MyLearningPage />;
  } else if (location.pathname.endsWith("/classrooms")) {
    pageContent = <ClassroomDashboard mode="student" />;
  } else if (location.pathname.endsWith("/library")) {
    pageContent = <LibraryPage />;
  } else if (location.pathname.endsWith("/profile")) {
    pageContent = <StudentProfilePage />;
  } else if (location.pathname.endsWith("/ai/tools")) {
    pageContent = <AiToolsPage />;
  } else if (location.pathname.endsWith("/ai")) {
    pageContent = <AiChatPage />;
  } else if (location.pathname.endsWith("/certificates")) {
    pageContent = <CertificatesPage />;
  }

  return (
    <section className="student-dashboard">
      <StudentSidebar />
      <main className="student-dashboard__content">{pageContent}</main>
    </section>
  );
}
