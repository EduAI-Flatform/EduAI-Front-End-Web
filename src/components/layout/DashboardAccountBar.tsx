import { SystemText } from '@/features/platform/SystemText';
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthSession } from "../../features/auth/auth-store";
import { NotificationCenter } from "../../features/notifications/NotificationCenter";
import { usePlatform } from "../../features/platform/PlatformProvider";
import { AccountDropdown, LanguageDropdown } from "./AccountControls";
import { GdsPointMark } from "../brand/GdsPointMark";
import { Wallet } from "lucide-react";
import { gdsWalletService, hasTrustedGdsBalance } from "../../services/gds-wallet.service";
import { tmiService } from "../../services/tmi.service";
import "./DashboardAccountBar.css";

export function DashboardAccountBar() {
  const session = useAuthSession();
  const { t, locale } = usePlatform();
  const location = useLocation();
  const [points, setPoints] = useState<number | null>(null);
  const [credit, setCredit] = useState<{ amount: string; currency: string } | null>(null);
  const isStudent = session?.user.roles.includes("student");
  const hasWallet = isStudent || session?.user.roles.includes("instructor");
  // Learners need consistent account metrics. Instructor-only account pages
  // preserve previous request behaviour to avoid unrelated wallet polling.
  const isAccountDetail = ["/billing", "/wallet/gds", "/membership-cards", "/settings", "/support", "/affiliate", "/profile"]
    .some(path => location.pathname === path || location.pathname.startsWith(path + "/"));
  const showBalances = Boolean(isStudent || !isAccountDetail);
  useEffect(() => {
    let active = true;
    setPoints(null);
    setCredit(null);
    if (showBalances && isStudent) {
      tmiService.wallet().then(wallet => {
        if (active && Number.isFinite(wallet.current)) setPoints(wallet.current);
      }).catch(() => {});
    }
    if (showBalances && hasWallet) {
      gdsWalletService.summary().then(wallet => {
        if (active && hasTrustedGdsBalance(wallet)) {
          setCredit({ amount: wallet.balance.availableMinor, currency: wallet.balance.currency });
        }
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [session?.user.id, isStudent, hasWallet, showBalances]);

  if (!session) return null;

  const formattedCredit = credit
    ? new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
        style: "currency", currency: credit.currency, maximumFractionDigits: 0,
      }).format(BigInt(credit.amount))
    : t("Chưa khả dụng", "Unavailable");

  return <div className="dashboard-account-bar">
    <div className="dashboard-account-bar__balances">
      {showBalances && isStudent && <Link to="/dashboard/tmi" className="dashboard-account-bar__metric dashboard-account-bar__metric--points" aria-label={t("Điểm thưởng GDS Point", "GDS Point rewards")}>
        <GdsPointMark size="small" /> <span>GDS Point</span> <strong>{points === null ? "—" : new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(points)}</strong>
      </Link>}
      {showBalances && hasWallet && <Link to="/wallet/gds" className="dashboard-account-bar__metric dashboard-account-bar__metric--credit">
        <Wallet size={16} aria-hidden="true" /> <SystemText message={"Tín dụng"} /> <strong>{formattedCredit}</strong>
      </Link>}
    </div>
    <div className="dashboard-account-bar__actions">
      <AccountDropdown />
      <LanguageDropdown />
      <NotificationCenter placement="header" />
    </div>
  </div>;
}
