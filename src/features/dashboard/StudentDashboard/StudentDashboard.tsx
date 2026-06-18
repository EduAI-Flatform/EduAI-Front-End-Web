import { useLocation } from "react-router-dom";
import { useAuthSession } from "../../auth/auth-store";
import { StudentDashboardHome } from "./StudentDashboardHome";
import { StudentProfilePage } from "./StudentProfilePage";
import { StudentSidebar } from "./StudentSidebar";
import "./StudentDashboard.css";

export function StudentDashboard() {
  const session = useAuthSession();
  const location = useLocation();
  const firstName =
    session?.user.fullName?.trim().split(/\s+/).slice(-1)[0] ?? "bạn";
  const pageContent = location.pathname.endsWith("/profile") ? (
    <StudentProfilePage />
  ) : (
    <StudentDashboardHome firstName={firstName} />
  );

  return (
    <section className="student-dashboard">
      <StudentSidebar />
      <main className="student-dashboard__content">{pageContent}</main>
    </section>
  );
}
