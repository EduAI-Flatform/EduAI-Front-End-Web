import {
  CalendarDays, Coins, GraduationCap, LayoutDashboard, Route, UserCircle2,
  BriefcaseBusiness, Handshake, Wallet, ReceiptText, Settings, LifeBuoy, IdCard,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { usePlatform } from "../../platform/PlatformProvider";
import { GdsBrand } from "../../../components/brand/GdsBrand";
import { useAuthSession } from "../../auth/auth-store";
import "./StudentSidebar.css";

type SidebarItem = {
  label: string;
  en: string;
  path: string;
  icon: typeof LayoutDashboard;
};

const sidebarGroups: { heading: string; headingEn: string; items: SidebarItem[] }[] = [
  {
    heading: "Tổng quan", headingEn: "Overview",
    items: [
      { label: "Bảng điều khiển", en: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Việc học của tôi", en: "My learning", path: "/dashboard/learning", icon: GraduationCap },
      { label: "Lộ trình AI", en: "AI learning path", path: "/dashboard/learning-path", icon: Route },
      { label: "Lớp trực tuyến", en: "Online classes", path: "/dashboard/classrooms", icon: CalendarDays },
    ],
  },
  {
    heading: "Nghề nghiệp", headingEn: "Career",
    items: [
      { label: "Ứng tuyển", en: "Applications", path: "/dashboard/job-applications", icon: BriefcaseBusiness },
      { label: "Cố vấn", en: "Mentors", path: "/dashboard/mentors", icon: Handshake },
      { label: "Lịch cố vấn", en: "Mentor bookings", path: "/dashboard/mentor-bookings", icon: CalendarDays },
    ],
  },
  {
    heading: "Tài khoản", headingEn: "Account",
    items: [
      { label: "Hồ sơ", en: "Profile", path: "/dashboard/profile", icon: UserCircle2 },
      { label: "Thẻ thành viên", en: "Membership cards", path: "/membership-cards", icon: IdCard },
      { label: "Ví GDS", en: "GDS wallet", path: "/wallet/gds", icon: Wallet },
      { label: "Đổi thưởng GDS Point", en: "GDS Point rewards", path: "/dashboard/tmi", icon: Coins },
      { label: "Thanh toán", en: "Billing", path: "/billing", icon: ReceiptText },
    ],
  },
  {
    heading: "Hỗ trợ", headingEn: "Support",
    items: [
      { label: "Cài đặt", en: "Settings", path: "/settings", icon: Settings },
      { label: "Hỗ trợ", en: "Support", path: "/support", icon: LifeBuoy },
    ],
  },
];

export function StudentSidebar() {
  const location = useLocation();
  const session = useAuthSession();
  const { t } = usePlatform();
  const groups = sidebarGroups.map(group => ({
    ...group,
    items: [...group.items, ...(group.heading === "Hỗ trợ" && session?.user.roles.includes("affiliate")
      ? [{ label: "Tiếp thị liên kết", en: "Affiliate", path: "/affiliate", icon: Handshake }]
      : [])],
  }));

  return (
    <aside className="student-sidebar" aria-label={t("Điều hướng học viên", "Student navigation")}>
      <Link className="student-sidebar__brand" to="/" aria-label={t("Trang chủ GDS", "GDS home")}>
        <GdsBrand />
      </Link>
      <nav className="student-sidebar__nav">
        {groups.map(group => (
          <div className="student-sidebar__group" key={group.heading}>
            <p className="student-sidebar__group-title">{t(group.heading, group.headingEn)}</p>
            {group.items.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.path ||
                (item.path !== "/dashboard" && location.pathname.startsWith(item.path + "/"));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`student-sidebar__link ${active ? "student-sidebar__link--active" : ""}`}
                >
                  <Icon aria-hidden="true" />
                  <span>{t(item.label, item.en)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
