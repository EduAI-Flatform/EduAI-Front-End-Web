import { SystemText } from '@/features/platform/SystemText';
import {
  BookOpen, BriefcaseBusiness, ChevronDown, Globe2, LayoutDashboard,
  LibraryBig, LogOut, MoreHorizontal, ReceiptText, Sparkles, UserRound,
  UsersRound, Award, Handshake, Wallet, ShoppingCart,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GdsBrand } from "../brand/GdsBrand";
import { clearAuthSession, useAuthSession } from "../../features/auth/auth-store";
import { NotificationCenter } from "../../features/notifications/NotificationCenter";
import { PwaInstallButton } from "../../features/pwa/PwaInstallButton";
import { usePlatform } from "../../features/platform/PlatformProvider";
import { authService } from "../../services/auth.service";
import "./header.css";

const navIcons: Record<string, typeof BookOpen> = {
  courses: BookOpen, learning: LayoutDashboard, library: LibraryBig, ai: Sparkles,
  jobs: BriefcaseBusiness, activities: UsersRound, certificates: Award, partners: Handshake,
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAuthSession();
  const { settings, locale, setLocale } = usePlatform();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const accountRef = useRef<HTMLDetailsElement>(null);
  const dashboardPath = getDashboardPath(session?.user.roles);
  const displayName = session?.user.fullName?.trim() || (locale === "vi" ? "Tài khoản" : "Account");
  const isStudent = Boolean(session?.user.roles.includes("student"));
  const hasWallet = isStudent || Boolean(session?.user.roles.includes("instructor"));
  const profilePath = isStudent ? "/dashboard/profile" : "/profile";
  const billingPath = "/billing";
  const navItems = settings.navigation.filter((item) => item.enabled).map((item) => ({
    ...item, path: item.id === "learning" && item.path === "/dashboard" ? dashboardPath : item.path,
  }));
  const activePath = navItems.filter(item => location.pathname === item.path ||
    (item.path !== "/" && location.pathname.startsWith(`${item.path}/`)))
    .sort((left, right) => right.path.length - left.path.length)[0]?.path;
  const mobileItems = navItems.slice(0, 5);
  const extraItems = navItems.slice(5);

  useEffect(() => {
    setIsMoreOpen(false);
    if (accountRef.current) accountRef.current.open = false;
  }, [location.pathname]);

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        accountRef.current.open = false;
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
        if (accountRef.current?.open) {
          accountRef.current.open = false;
          accountRef.current.querySelector("summary")?.focus();
        }
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  async function handleLogout() {
    try { await authService.logout(session?.refreshToken); } catch { /* Clear this browser session even if the remote token expired. */ }
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  function renderNavItems(items: typeof navItems, showIcons = false) {
    return items.map((item) => {
      const Icon = navIcons[item.id] || BookOpen;
      const isActive = item.path === activePath;
      const label = item.label[locale];
      const content = <>{showIcons ? <Icon aria-hidden="true" className="app-header__nav-icon" /> : null}<span>{label}</span>
      </>;
      const className = `app-header__nav-link ${isActive ? "app-header__nav-link--active" : ""}`;
      return /^https:\/\//.test(item.path)
        ? <a className={className} href={item.path} key={item.id} rel="noopener noreferrer" target="_blank">{content}</a>
        : <Link aria-current={isActive ? "page" : undefined} className={className} key={item.id} to={item.path}>{content}</Link>;
    });
  }

  return (
    <>
      <header className="app-header">
        <nav aria-label={locale === "vi" ? "Điều hướng đầu trang" : "Main navigation"} className="app-header__container container">
          <Link aria-label={locale === "vi" ? "GDS — Trang chủ" : "GDS — Home"} className="app-header__brand" to="/">
            <GdsBrand />
          </Link>
          <div className="app-header__nav">{renderNavItems(navItems)}</div>
          <div className="app-header__actions">
            <PwaInstallButton />
            {session ? (
              <details className="app-header__account" ref={accountRef}>
                <summary aria-label={`${locale === "vi" ? "Tài khoản" : "Account"}: ${displayName}`} className="app-header__user">
                  <span className="app-header__avatar">{session.user.avatarUrl ? <img alt="" className="app-header__avatar-image" src={session.user.avatarUrl} /> : <UserRound aria-hidden="true" className="app-header__avatar-icon" />}</span>
                  <span className="app-header__user-name">{displayName}</span>
                  <ChevronDown aria-hidden="true" size={16} />
                </summary>
                <div className="app-header__account-panel">
                  <div className="app-header__account-identity">
                    <strong>{displayName}</strong>
                    <span>{session.user.email}</span>
                    <small>ID: {session.user.id}</small>
                  </div>
                  <Link to={profilePath}>
                    <UserRound aria-hidden="true" size={18} /><SystemText message={"Hồ sơ"} /></Link>
                  <Link to={billingPath}>
                    <ReceiptText aria-hidden="true" size={18} /><SystemText message={"Thanh toán"} /></Link>
                  {isStudent ? <Link to="/cart">
                    <ShoppingCart aria-hidden="true" size={18} />{locale === "vi" ? <SystemText message={"Giỏ hàng"} /> : <SystemText message={"Giỏ hàng của tôi"} />}</Link> : null}
                  {hasWallet ? <Link to="/wallet/gds">
                    <Wallet aria-hidden="true" size={18} />{locale === "vi" ? <SystemText message={"Ví GDS"} /> : <SystemText message={"Ví GDS"} />}</Link> : null}
                  <button onClick={() => void handleLogout()} type="button">
                    <LogOut aria-hidden="true" size={18} />{locale === "vi" ? <SystemText message={"Đăng xuất"} /> : <SystemText message={"Đăng xuất"} />}</button>
                </div>
              </details>
            ) : <Link className="app-header__login" to="/login">{locale === "vi" ? <SystemText message={"Đăng nhập"} /> : <SystemText message={"Đăng nhập"} />}</Link>}
            <label className="app-header__locale">
              <Globe2 aria-hidden="true" size={20} />
              <span className="sr-only">{locale === "vi" ? <SystemText message={"Ngôn ngữ"} /> : <SystemText message={"Ngôn ngữ"} />}</span>
              <select aria-label={locale === "vi" ? "Ngôn ngữ" : "Language"} onChange={(event) => setLocale(event.target.value as "vi" | "en")} value={locale}>
                <option value="vi">VI</option>
                <option value="en">EN</option>
              </select>
            </label>
            {session ? <NotificationCenter placement="header" /> : null}
          </div>
        </nav>
      </header>
      <nav aria-label={locale === "vi" ? "Điều hướng chính" : "Mobile navigation"} className="app-header__mobile-nav">
        {renderNavItems(mobileItems, true)}
        <button aria-controls="gds-mobile-more" aria-expanded={isMoreOpen} className="app-header__nav-link app-header__more-button" onClick={() => setIsMoreOpen((current) => !current)} type="button">
          <MoreHorizontal aria-hidden="true" className="app-header__nav-icon" />
          <span>{locale === "vi" ? <SystemText message={"Thêm"} /> : <SystemText message={"Thêm mục"} />}</span>
        </button>
      </nav>
      {isMoreOpen ? <div aria-label={locale === "vi" ? "Điều hướng bổ sung" : "More navigation"} className="app-header__more-menu" id="gds-mobile-more">
        <div>{renderNavItems(extraItems, true)}</div>
      </div> : null}
    </>
  );
}

function getDashboardPath(roles: string[] | undefined): string {
  if (roles?.includes("platform_admin")) return "/admin/dashboard";
  if (roles?.includes("instructor")) return "/instructor/dashboard";
  return "/dashboard";
}
