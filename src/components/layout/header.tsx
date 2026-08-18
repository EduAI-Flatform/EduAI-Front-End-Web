import {
  BookOpen,
  LogOut,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearAuthSession, useAuthSession } from "../../features/auth/auth-store";
import { authService } from "../../services/auth.service";
import "./header.css";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAuthSession();
  const dashboardPath = getDashboardPath(session?.user.roles);
  const displayName = session?.user.fullName?.trim() || "Người dùng";
  const avatarUrl = session?.user.avatarUrl;

  const navItems = [
    { icon: BookOpen, label: "Khóa học", path: "/courses" },
    { icon: UsersRound, label: "Cộng đồng", path: "/community" },
    { icon: Sparkles, label: "Tính năng", path: "/ai" },
  ];

  async function handleLogout() {
    const refreshToken = session?.refreshToken;

    try {
      await authService.logout(refreshToken);
    } catch {
      // Local logout should still complete even if the token is already invalid.
    }

    clearAuthSession();
    navigate("/login", { replace: true });
  }

  const renderNavItems = (showIcons = false) =>
    navItems.map((item) => {
      const Icon = item.icon;
      const isActive = isNavItemActive(location.pathname, item.path);

      return (
        <Link
          aria-current={isActive ? "page" : undefined}
          className={`app-header__nav-link ${isActive ? "app-header__nav-link--active" : ""}`}
          key={item.path}
          to={item.path}
        >
          {showIcons ? (
            <Icon aria-hidden="true" className="app-header__nav-icon" />
          ) : null}
          <span>{item.label}</span>
        </Link>
      );
    });

  return (
    <>
      <header className="app-header">
        <nav className="app-header__container container">
        <Link className="app-header__brand" to="/">
          EduAI
        </Link>

          <div className="app-header__nav">{renderNavItems()}</div>

          <div className="app-header__actions">
          {session ? (
            <>
              <Link
                aria-label={`Mở bảng điều khiển của ${displayName}`}
                className="app-header__user"
                to={dashboardPath}
              >
                <span className="app-header__avatar">
                  {avatarUrl ? (
                    <img alt="" className="app-header__avatar-image" src={avatarUrl} />
                  ) : (
                    <UserRound aria-hidden="true" className="app-header__avatar-icon" />
                  )}
                </span>
                <span className="app-header__user-name">{displayName}</span>
              </Link>

              <button
                aria-label="Đăng xuất"
                className="app-header__logout"
                onClick={handleLogout}
                type="button"
              >
                <LogOut aria-hidden="true" className="app-header__logout-icon" />
              </button>
            </>
          ) : (
            <>
              <Link className="app-header__login" to="/login">
                Đăng nhập
              </Link>
              <Link className="app-header__signup" to="/register">
                Đăng ký
              </Link>
            </>
          )}
          </div>
        </nav>
      </header>

      <nav aria-label="Điều hướng chính" className="app-header__mobile-nav">
        {renderNavItems(true)}
      </nav>
    </>
  );
}

function isNavItemActive(pathname: string, itemPath: string): boolean {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function getDashboardPath(roles: string[] | undefined): string {
  if (roles?.includes("platform_admin") || roles?.includes("admin")) {
    return "/admin/dashboard";
  }

  if (roles?.includes("instructor")) {
    return "/instructor/dashboard";
  }

  return "/dashboard";
}
