import { useLocation } from "react-router-dom";
import { useAuthSession } from "../../auth/auth-store";
import { MyLearningPage } from "./MyLearningPage";
import { StudentDashboardHome } from "./StudentDashboardHome";
import { StudentProfilePage } from "./StudentProfilePage";
import { StudentSidebar } from "./StudentSidebar";
import "./StudentDashboard.css";

export function StudentDashboard() {
  const session = useAuthSession();
  const location = useLocation();
  const firstName =
    session?.user.fullName?.trim().split(/\s+/).slice(-1)[0] ?? "bạn";
  let pageContent = <StudentDashboardHome firstName={firstName} />;

  if (location.pathname.endsWith("/learning")) {
    pageContent = <MyLearningPage />;
  } else if (location.pathname.endsWith("/profile")) {
    pageContent = <StudentProfilePage />;
  }

  return (
    <section className="student-dashboard">
      <StudentSidebar />
      <main className="student-dashboard__content">{pageContent}</main>
    </section>
  );
}
