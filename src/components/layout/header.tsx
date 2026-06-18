import { LogOut, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearAuthSession, useAuthSession } from "../../features/auth/auth-store";
import "./header.css";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAuthSession();
  const dashboardPath = getDashboardPath(session?.user.roles);
  const displayName = session?.user.fullName?.trim() || "Người dùng";
  const avatarUrl = session?.user.avatarUrl;

  const navItems = [
    { label: "Khóa học", path: "/courses" },
    { label: "Tính năng", path: "/ai" },
    { label: "Bảng giá", path: "/pricing" },
  ];

  function handleLogout() {
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  return (
    <header className="app-header">
      <nav className="app-header__container container">
        <Link className="app-header__brand" to="/">
          EduAI
        </Link>

        <div className="app-header__nav">
          {navItems.map((item) => (
            <Link
              className={`app-header__nav-link ${
                location.pathname === item.path
                  ? "app-header__nav-link--active"
                  : ""
              }`}
              key={item.path}
              to={item.path}
            >
              {item.label}
            </Link>
          ))}
        </div>

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
  );
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
