import { Bell, BrainCircuit, LogOut, Search, UserCircle2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearAuthSession, useAuthSession } from "../../features/auth/auth-store";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAuthSession();

  const menus = [
    {
      label: "Trang chủ",
      path: "/",
    },
    {
      label: "Khóa học",
      path: "/courses",
    },
    {
      label: "Thư viện",
      path: "/library",
    },
    ...(session
      ? [
          {
            label: "Dashboard",
            path: "/dashboard",
          },
        ]
      : [
          {
            label: "Đăng nhập",
            path: "/login",
          },
          {
            label: "Đăng ký",
            path: "/register",
          },
        ]),
  ];

  function handleLogout() {
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="container flex min-h-16 flex-wrap items-center gap-3 py-3">
        <Link
          className="flex items-center gap-2 font-heading text-lg font-bold text-foreground"
          to="/"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BrainCircuit aria-hidden="true" className="h-5 w-5" />
          </span>
          EduAI
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto sm:justify-center">
          {menus.map((item) => (
            <Link
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                location.pathname === item.path
                  ? "bg-muted text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              key={item.path}
              to={item.path}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-56">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Tìm kiếm khóa học"
              className="pl-9"
              name="search"
              placeholder="Tìm khóa học"
            />
          </div>
          <Button aria-label="Thông báo" size="icon" variant="ghost">
            <Bell aria-hidden="true" className="h-5 w-5" />
          </Button>
          {session ? (
            <Button
              aria-label="Đăng xuất"
              onClick={handleLogout}
              size="icon"
              type="button"
              variant="outline"
            >
              <LogOut aria-hidden="true" className="h-5 w-5" />
            </Button>
          ) : (
            <Button aria-label="Hồ sơ" size="icon" variant="outline">
              <UserCircle2 aria-hidden="true" className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
