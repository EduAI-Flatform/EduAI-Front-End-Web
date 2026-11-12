import { useSystemMessages } from '@/features/platform/SystemText';
import {
  Award,
  Bot,
  CalendarDays,
  Coins,
  GraduationCap,
  House,
  LayoutDashboard,
  Library,
  MessageSquare,
  Route,
  Sparkles,
  UserCircle2,
  BriefcaseBusiness,
  Handshake,
  Wallet,
  ReceiptText,
  Settings,
  LifeBuoy,
  IdCard,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { usePlatform } from "../../platform/PlatformProvider";
import { GdsBrand } from "../../../components/brand/GdsBrand";
import "./StudentSidebar.css";

const sidebarItems = [
  { label: "Trang chủ", path: "/", icon: House },
  { label: "Bảng điều khiển", path: "/dashboard", icon: LayoutDashboard },
  { label: "Việc học của tôi", path: "/dashboard/learning", icon: GraduationCap },
  { label: "Lộ trình AI", path: "/dashboard/learning-path", icon: Route },
  { label: "Lớp trực tuyến", path: "/dashboard/classrooms", icon: CalendarDays },
  { label: "Thư viện", path: "/dashboard/library", icon: Library },
  { label: "Cộng đồng", path: "/dashboard/community", icon: MessageSquare },
  { label: "Chứng chỉ", path: "/dashboard/certificates", icon: Award },
  { label: "Đổi thưởng TMI", path: "/dashboard/tmi", icon: Coins },
  { label: "Ví GDS", path: "/wallet/gds", icon: Wallet },
  { label: "Trợ lý AI", path: "/dashboard/ai", icon: Bot },
  { label: "Công cụ AI", path: "/dashboard/ai/tools", icon: Sparkles },
  { label: "Hồ sơ", path: "/dashboard/profile", icon: UserCircle2 },
  { label: "Ứng tuyển", path: "/dashboard/job-applications", icon: BriefcaseBusiness },
  { label: "Cố vấn", path: "/dashboard/mentors", icon: Handshake },
  { label: "Lịch cố vấn", path: "/dashboard/mentor-bookings", icon: CalendarDays },
  { label: "Thẻ thành viên", path: "/membership-cards", icon: IdCard },
  { label: "Billing", path: "/billing", icon: ReceiptText },
  { label: "Cài đặt", path: "/settings", icon: Settings },
  { label: "Hỗ trợ", path: "/support", icon: LifeBuoy },
  { label: "Affiliate", path: "/affiliate", icon: Handshake },
];

export function StudentSidebar() {
  const messageForUi = useSystemMessages();
  const location = useLocation();
  const { t } = usePlatform();
  const labels: Record<string, string> = {
    "/": "Home", "/dashboard": "Dashboard", "/dashboard/learning": "My learning",
    "/dashboard/learning-path": "AI learning path", "/dashboard/classrooms": "Online classes",
    "/dashboard/library": "Library", "/dashboard/community": "Community",
    "/dashboard/certificates": "Certificates", "/dashboard/tmi": "TMI rewards",
    "/wallet/gds": "GDS wallet", "/dashboard/ai": "AI assistant",
    "/dashboard/ai/tools": "AI tools", "/dashboard/profile": "Profile",
    "/dashboard/job-applications": "Applications", "/dashboard/mentors": "Mentors",
    "/dashboard/mentor-bookings": "Mentor bookings",
    "/membership-cards": "Membership cards", "/billing": "Billing", "/settings": "Settings", "/support": "Support", "/affiliate": "Affiliate",
  };

  return (
    <aside className="student-sidebar" aria-label={messageForUi("Điều hướng học viên")}>
      <Link className="student-sidebar__brand" to="/">
        <GdsBrand />
      </Link>

      <nav className="student-sidebar__nav">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              aria-label={t(item.label, labels[item.path])}
              className={`student-sidebar__link ${
                isActive ? "student-sidebar__link--active" : ""
              }`}
              key={item.path}
              to={item.path}
            >
              <Icon aria-hidden="true" />
              <span>{t(item.label, labels[item.path])}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
