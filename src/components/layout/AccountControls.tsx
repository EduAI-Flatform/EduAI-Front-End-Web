import { useEffect, useRef, type ReactNode } from "react";
import { Check, ChevronDown, Globe2, LogOut, ReceiptText, Settings, ShoppingCart, UserRound, Wallet } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthSession, clearAuthSession } from "../../features/auth/auth-store";
import { usePlatform } from "../../features/platform/PlatformProvider";
import { authService } from "../../services/auth.service";
import "./AccountControls.css";

function useDismissMenu(ref: React.RefObject<HTMLDetailsElement>) {
  const location = useLocation();
  useEffect(() => { if (ref.current) ref.current.open = false; }, [location.pathname, ref]);
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false;
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [ref]);
}

export function AccountDropdown({ children }: { children?: ReactNode }) {
  const session = useAuthSession();
  const { t } = usePlatform();
  const navigate = useNavigate();
  const details = useRef<HTMLDetailsElement>(null);
  useDismissMenu(details);
  if (!session) return null;
  const name = session.user.fullName?.trim() || t("Tài khoản", "Account");
  const isStudent = session.user.roles?.includes("student");
  const canWallet = isStudent || session.user.roles?.includes("instructor");
  async function logout() {
    try { await authService.logout(session?.refreshToken); } catch { /* session still cleared */ }
    clearAuthSession();
    navigate("/login", { replace: true });
  }
  return <details ref={details} className="gds-account-menu app-header__account dashboard-account-bar__account">
    <summary className="gds-account-menu__trigger app-header__user" aria-label={t("Tài khoản", "Account") + ": " + name}>
      <span className="gds-account-menu__avatar app-header__avatar">
        {session.user.avatarUrl ? <img src={session.user.avatarUrl} alt="" className="app-header__avatar-image" /> : <UserRound aria-hidden="true" className="app-header__avatar-icon" />}
      </span>
      <span className="app-header__user-name">{name}</span>
      <ChevronDown size={16} aria-hidden="true" />
    </summary>
    <div className="gds-account-menu__panel app-header__account-panel dashboard-account-bar__menu">
      <div className="gds-account-menu__identity app-header__account-identity"><strong>{name}</strong><span>{session.user.email}</span></div>
      <Link to="/profile"><UserRound aria-hidden="true" size={18} />{t("Hồ sơ", "Profile")}</Link>
      <Link to="/billing"><ReceiptText aria-hidden="true" size={18} />{t("Thanh toán", "Billing")}</Link>
      {isStudent && <Link to="/cart"><ShoppingCart aria-hidden="true" size={18} />{t("Giỏ hàng", "Cart")}</Link>}
      {canWallet && <Link to="/wallet/gds"><Wallet aria-hidden="true" size={18} />{t("Ví GDS", "GDS wallet")}</Link>}
      <Link to="/settings"><Settings aria-hidden="true" size={18} />{t("Cài đặt", "Settings")}</Link>
      <button type="button" onClick={() => void logout()}><LogOut aria-hidden="true" size={18} />{t("Đăng xuất", "Log out")}</button>
      {children}
    </div>
  </details>;
}

export function LanguageDropdown() {
  const { locale, setLocale, t } = usePlatform();
  const ref = useRef<HTMLDetailsElement>(null);
  useDismissMenu(ref);
  const choose = (value: "vi" | "en") => {
    setLocale(value);
    if (ref.current) { ref.current.open = false; ref.current.querySelector("summary")?.focus(); }
  };
  return <details ref={ref} className="gds-language-menu">
    <summary aria-label={t("Ngôn ngữ", "Language")} aria-haspopup="true">
      <Globe2 size={18} aria-hidden="true" /><span>{locale.toUpperCase()}</span><ChevronDown size={14} aria-hidden="true" />
    </summary>
    <div className="gds-language-menu__panel" aria-label={t("Chọn ngôn ngữ", "Choose a language")}>
      <button type="button" onClick={() => choose("vi")} aria-current={locale === "vi" ? "true" : undefined}>
        <span>{t("Tiếng Việt", "Vietnamese")}</span>{locale === "vi" && <Check size={16} aria-hidden="true" />}
      </button>
      <button type="button" onClick={() => choose("en")} aria-current={locale === "en" ? "true" : undefined}>
        <span>{t("Tiếng Anh", "English")}</span>{locale === "en" && <Check size={16} aria-hidden="true" />}
      </button>
    </div>
  </details>;
}
