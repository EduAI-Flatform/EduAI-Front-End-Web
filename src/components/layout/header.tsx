import { SystemText } from "@/features/platform/SystemText";
import {
  BookOpen, BriefcaseBusiness, LayoutDashboard,
  LibraryBig, MoreHorizontal, Sparkles,
  UsersRound, Award, Handshake,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { GdsBrand } from "../brand/GdsBrand";
import { useAuthSession } from "../../features/auth/auth-store";
import { NotificationCenter } from "../../features/notifications/NotificationCenter";
import { PwaInstallButton } from "../../features/pwa/PwaInstallButton";
import { usePlatform } from "../../features/platform/PlatformProvider";
import { AccountDropdown, LanguageDropdown } from "./AccountControls";
import "./header.css";

const navIcons: Record<string, typeof BookOpen> = {
  courses: BookOpen, learning: LayoutDashboard, library: LibraryBig, ai: Sparkles,
  jobs: BriefcaseBusiness, activities: UsersRound, certificates: Award, partners: Handshake,
};

export default function Header() {
  const location = useLocation();
  const session = useAuthSession();
  const { settings, locale } = usePlatform();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  // Use stable public destinations even when older Platform Settings still store dashboard URLs.
  const navItems = settings.navigation.filter((item) => item.enabled).map((item) => ({
    ...item,
    path: item.id === "learning" ? "/study" :
      item.id === "certificates" ? "/certificates" : item.path,
  }));
  const activePath = navItems.filter(item => location.pathname === item.path ||
    (item.path !== "/" && location.pathname.startsWith(`${item.path}/`)))
    .sort((left, right) => right.path.length - left.path.length)[0]?.path;
  const mobileItems = navItems.slice(0, 5);
  const extraItems = navItems.slice(5);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (document.getElementById('gds-mobile-more')?.contains(document.activeElement)) moreButtonRef.current?.focus();
        setIsMoreOpen(false);
      }
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, []);

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
            {session ? <AccountDropdown /> : <Link className="app-header__login" to="/login">{locale === "vi" ? <SystemText message={"Đăng nhập"} /> : <SystemText message={"Đăng nhập"} />}</Link>}
            <LanguageDropdown />
            {session ? <NotificationCenter placement="header" /> : null}
          </div>
        </nav>
      </header>
      <nav aria-label={locale === "vi" ? "Điều hướng chính" : "Mobile navigation"} className="app-header__mobile-nav">
        {renderNavItems(mobileItems, true)}
        <button ref={moreButtonRef} aria-controls="gds-mobile-more" aria-expanded={isMoreOpen} className="app-header__nav-link app-header__more-button" onClick={() => setIsMoreOpen((current) => !current)} type="button">
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

