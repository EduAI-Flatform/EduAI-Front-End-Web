import {
  Award,
  Bot,
  GraduationCap,
  House,
  LayoutDashboard,
  Library,
  MessageSquare,
  UserCircle2,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import "./StudentSidebar.css";

const sidebarItems = [
  { label: "Trang chủ", path: "/", icon: House },
  { label: "Bảng điều khiển", path: "/dashboard", icon: LayoutDashboard },
  { label: "Việc học của tôi", path: "/dashboard/learning", icon: GraduationCap },
  { label: "Thư viện", path: "/dashboard/library", icon: Library },
  { label: "Cộng đồng", path: "/dashboard/community", icon: MessageSquare },
  { label: "Chứng chỉ", path: "/dashboard/certificates", icon: Award },
  { label: "Trợ lý AI", path: "/dashboard/ai", icon: Bot },
  { label: "Hồ sơ", path: "/dashboard/profile", icon: UserCircle2 },
];

export function StudentSidebar() {
  const location = useLocation();

  return (
    <aside className="student-sidebar" aria-label="Điều hướng học viên">
      <Link className="student-sidebar__brand" to="/">
        <h2>EduAI</h2>
        <p>Học tập cùng AI</p>
      </Link>

      <nav className="student-sidebar__nav">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              className={`student-sidebar__link ${
                isActive ? "student-sidebar__link--active" : ""
              }`}
              key={item.path}
              to={item.path}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link className="student-sidebar__upgrade" to="/pricing">
        Nâng cấp Pro
      </Link>
    </aside>
  );
}
