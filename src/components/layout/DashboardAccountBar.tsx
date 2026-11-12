import { SystemText } from '@/features/platform/SystemText';
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe2, LogOut, ReceiptText, Settings, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearAuthSession, useAuthSession } from "../../features/auth/auth-store";
import { NotificationCenter } from "../../features/notifications/NotificationCenter";
import { usePlatform } from "../../features/platform/PlatformProvider";
import { authService } from "../../services/auth.service";
import { gdsWalletService, hasTrustedGdsBalance } from "../../services/gds-wallet.service";
import { tmiService } from "../../services/tmi.service";
import "./DashboardAccountBar.css";

export function DashboardAccountBar() {
  const session = useAuthSession();
  const { t, locale, setLocale } = usePlatform();
  const navigate = useNavigate();
  const location = useLocation();
  const details = useRef<HTMLDetailsElement>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [credit, setCredit] = useState<{ amount: string; currency: string } | null>(null);
  const isStudent = session?.user.roles.includes("student");
  const hasWallet = isStudent || session?.user.roles.includes("instructor");

  useEffect(() => {
    let active = true;
    setPoints(null);
    setCredit(null);
    if (isStudent) {
      tmiService.wallet().then(wallet => {
        if (active && Number.isFinite(wallet.current)) setPoints(wallet.current);
      }).catch(() => {});
    }
    if (hasWallet) {
      gdsWalletService.summary().then(wallet => {
        if (active && hasTrustedGdsBalance(wallet)) {
          setCredit({ amount: wallet.balance.availableMinor, currency: wallet.balance.currency });
        }
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [session?.user.id, isStudent, hasWallet]);

  useEffect(() => {
    if (details.current) details.current.open = false;
  }, [location.pathname]);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (details.current && !details.current.contains(event.target as Node)) details.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && details.current?.open) {
        details.current.open = false;
        details.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  if (!session) return null;

  async function logout() {
    try { await authService.logout(session?.refreshToken); } catch {}
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  const formattedCredit = credit
    ? new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
        style: "currency", currency: credit.currency, maximumFractionDigits: 0,
      }).format(BigInt(credit.amount))
    : t("Chưa khả dụng", "Unavailable");

  return <div className="dashboard-account-bar">
    <div className="dashboard-account-bar__balances">
      {isStudent && <Link to="/dashboard/tmi" className="dashboard-account-bar__metric">
        GDS Point <strong>{points === null ? "—" : new Intl.NumberFormat(locale).format(points)}</strong>
      </Link>}
      {hasWallet && <Link to="/wallet/gds" className="dashboard-account-bar__metric">
        <SystemText message={"Tín dụng"} /> <strong>{formattedCredit}</strong>
      </Link>}
    </div>
    <div className="dashboard-account-bar__actions">
      <details ref={details} className="dashboard-account-bar__account">
        <summary>
          {session.user.avatarUrl ? <img src={session.user.avatarUrl} alt="" /> : <UserRound aria-hidden="true" />}
          <span>{session.user.fullName}</span><ChevronDown size={16} aria-hidden="true" />
        </summary>
        <div className="dashboard-account-bar__menu">
          <strong>{session.user.fullName}</strong><small>{session.user.email}</small><small>ID {session.user.id}</small>
          <Link to="/profile"><UserRound size={18} aria-hidden="true" /><SystemText message={"Hồ sơ"} /></Link>
          <Link to="/billing"><ReceiptText size={18} aria-hidden="true" /><SystemText message={"Thanh toán"} /></Link>
          <Link to="/settings"><Settings size={18} aria-hidden="true" />{t("Cài đặt", "Settings")}</Link>
          <button type="button" onClick={() => void logout()}><LogOut size={18} aria-hidden="true" />{t("Đăng xuất", "Log out")}</button>
        </div>
      </details>
      <label className="dashboard-account-bar__locale"><Globe2 size={18} aria-hidden="true" />
        <span className="sr-only">{t("Ngôn ngữ", "Language")}</span>
        <select value={locale} onChange={event => setLocale(event.target.value as "vi" | "en")}><option value="vi">VI</option><option value="en">EN</option></select>
      </label>
      <NotificationCenter placement="header" />
    </div>
  </div>;
}
