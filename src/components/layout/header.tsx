import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  MoreHorizontal,
  Sparkles,
  ShoppingCart,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearAuthSession, useAuthSession } from "../../features/auth/auth-store";
import { authService } from "../../services/auth.service";
import "./header.css";

interface NavItem {
  icon: typeof BookOpen;
  label: string;
  path: string;
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAuthSession();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const dashboardPath = getDashboardPath(session?.user.roles);
  const displayName = session?.user.fullName?.trim() || "Người dùng";
  const avatarUrl = session?.user.avatarUrl;

  const primaryItems: NavItem[] = [
    { icon: BookOpen, label: "Khóa học", path: "/courses" },
    { icon: BriefcaseBusiness, label: "Việc làm", path: "/jobs" },
    { icon: UsersRound, label: "Cộng đồng", path: "/community" },
    { icon: LayoutDashboard, label: "Học tập", path: dashboardPath },
    { icon: Sparkles, label: "AI", path: "/ai" },
  ];
  const secondaryItems: NavItem[] = [
    { icon: LibraryBig, label: "Thư viện", path: "/library" },
    { icon: Award, label: "Chứng chỉ", path: "/dashboard/certificates" },
  ];
  const desktopItems = [
    primaryItems[0],
    primaryItems[1],
    primaryItems[2],
    secondaryItems[0],
    primaryItems[3],
    primaryItems[4],
    secondaryItems[1],
  ];

  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    const refreshToken = session?.refreshToken;
    try {
      await authService.logout(refreshToken);
    } catch {
      // Local logout remains authoritative when the remote token has expired.
    }
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  function renderNavItems(items: NavItem[], showIcons = false) {
    return items.map((item) => {
      const Icon = item.icon;
      const isActive =
        isNavItemActive(location.pathname, item.path) &&
        !(item.path === dashboardPath && location.pathname.startsWith("/dashboard/certificates"));

      return (
        <Link
          aria-current={isActive ? "page" : undefined}
          className={`app-header__nav-link ${isActive ? "app-header__nav-link--active" : ""}`}
          key={item.path}
          to={item.path}
        >
          {showIcons ? <Icon aria-hidden="true" className="app-header__nav-icon" /> : null}
          <span>{item.label}</span>
        </Link>
      );
    });
  }

  const isMoreActive = secondaryItems.some((item) =>
    isNavItemActive(location.pathname, item.path),
  );

  return (
    <>
      <header className="app-header">
        <nav aria-label="Điều hướng đầu trang" className="app-header__container container">
          <Link className="app-header__brand" to="/">EduAI</Link>
          <div className="app-header__nav">{renderNavItems(desktopItems)}</div>
          <div className="app-header__actions">
            {session ? (
              <>
                <Link aria-label="Mở giỏ hàng" className="app-header__cart" to="/cart">
                  <ShoppingCart aria-hidden="true" />
                </Link>
                <Link aria-label={`Mở bảng điều khiển của ${displayName}`} className="app-header__user" to={dashboardPath}>
                  <span className="app-header__avatar">
                    {avatarUrl ? <img alt="" className="app-header__avatar-image" src={avatarUrl} /> : <UserRound aria-hidden="true" className="app-header__avatar-icon" />}
                  </span>
                  <span className="app-header__user-name">{displayName}</span>
                </Link>
                <button aria-label="Đăng xuất" className="app-header__logout" onClick={handleLogout} type="button">
                  <LogOut aria-hidden="true" className="app-header__logout-icon" />
                </button>
              </>
            ) : (
              <>
                <Link className="app-header__login" to="/login">Đăng nhập</Link>
                <Link className="app-header__signup" to="/register">Đăng ký</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <nav aria-label="Điều hướng chính" className="app-header__mobile-nav">
        {renderNavItems(primaryItems, true)}
        <button
          aria-expanded={isMoreOpen}
          aria-label="Thêm"
          className={`app-header__nav-link app-header__more-button ${isMoreActive ? "app-header__nav-link--active" : ""}`}
          onClick={() => setIsMoreOpen((current) => !current)}
          type="button"
        >
          <MoreHorizontal aria-hidden="true" className="app-header__nav-icon" />
          <span>Thêm</span>
        </button>
      </nav>

      {isMoreOpen ? (
        <div aria-label="Thêm điều hướng" aria-modal="false" className="app-header__more-menu" role="dialog">
          <p>Khám phá thêm</p>
          <div>{renderNavItems(secondaryItems, true)}</div>
        </div>
      ) : null}
    </>
  );
}

function isNavItemActive(pathname: string, itemPath: string): boolean {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function getDashboardPath(roles: string[] | undefined): string {
  if (roles?.includes("platform_admin") || roles?.includes("admin")) return "/admin/dashboard";
  if (roles?.includes("instructor")) return "/instructor/dashboard";
  return "/dashboard";
}
