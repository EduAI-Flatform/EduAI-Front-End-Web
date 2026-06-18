import { useAuthSession } from "../../auth/auth-store";
import { StudentDashboardHome } from "./StudentDashboardHome";
import { StudentSidebar } from "./StudentSidebar";
import "./StudentDashboard.css";

export function StudentDashboard() {
  const session = useAuthSession();
  const firstName =
    session?.user.fullName?.trim().split(/\s+/).slice(-1)[0] ?? "bạn";

  return (
    <section className="student-dashboard">
      <StudentSidebar />
      <main className="student-dashboard__content">
        <StudentDashboardHome firstName={firstName} />
      </main>
    </section>
  );
}
