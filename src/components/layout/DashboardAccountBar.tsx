import { SystemText } from '@/features/platform/SystemText';
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthSession } from "../../features/auth/auth-store";
import { NotificationCenter } from "../../features/notifications/NotificationCenter";
import { usePlatform } from "../../features/platform/PlatformProvider";
import { AccountDropdown, LanguageDropdown } from "./AccountControls";
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
  // Account-detail screens already provide the authoritative balance/points.
  // Avoid duplicated amounts and unnecessary financial API reads in their toolbar.
  const isAccountDetail = ["/billing", "/wallet/gds", "/membership-cards", "/settings", "/support", "/affiliate", "/profile"]
    .some(path => location.pathname === path || location.pathname.startsWith(path + "/"));
  const showBalances = !isAccountDetail;

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
      {showBalances && isStudent && <Link to="/dashboard/tmi" className="dashboard-account-bar__metric">
        GDS Point <strong>{points === null ? "—" : new Intl.NumberFormat(locale).format(points)}</strong>
      </Link>}
      {showBalances && hasWallet && <Link to="/wallet/gds" className="dashboard-account-bar__metric">
        <SystemText message={"Tín dụng"} /> <strong>{formattedCredit}</strong>
      </Link>}
    </div>
    <div className="dashboard-account-bar__actions">
      <AccountDropdown />
      <LanguageDropdown />
      <NotificationCenter placement="header" />
    </div>
  </div>;
}
