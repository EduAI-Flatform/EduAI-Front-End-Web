import { SystemText } from '@/features/platform/SystemText';
import { useState } from "react";
import { usePlatform } from "./PlatformProvider";
import { platformSettingsService, type MembershipImpact } from "../../services/platform-settings.service";

export function MembershipImpactPanel({ initial }: { initial: MembershipImpact }) {
  const { t, locale } = usePlatform();
  const [page, setPage] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function next() {
    if (!page.nextCursor) return;
    setBusy(true); setError("");
    try { setPage(await platformSettingsService.membershipImpact(initial.policyRevisionId, page.nextCursor)); }
    catch { setError(t("Không tải được kết quả mô phỏng.", "Unable to load simulation results.")); }
    finally { setBusy(false); }
  }
  return <section className="platform-impact">
    <h3>{t("Mô phỏng thẻ thành viên", "Membership card simulation")}</h3>
    {page.status === "unavailable" ? <p>{t("Chưa đủ dữ liệu hợp lệ để tính hạng.", "Valid source data is not yet available for qualification.")} {page.reason}</p>
      : <>
        <p>{t("Tài khoản đã xét trên trang", "Accounts evaluated on this page")} {page.evaluatedUsers ?? 0} / {page.totalUsers ?? 0}</p>
        <p>{t("Số tài khoản đổi hạng trên trang", "Projected tier changes on this page")} {page.projectedChangesOnPage ?? 0}</p>
        <div className="platform-impact__rows">{page.items.map(item => <article key={item.userId}>
          <code>{item.userId}</code>
          <span>{item.previousTierCode ?? "—"} → {item.evaluation.tier?.name[locale] ?? item.evaluation.status}</span>
          <span>{t("Chi tiêu đủ điều kiện", "Qualifying spending")} {item.evaluation.qualifyingAmountMinor ?? "—"} {item.evaluation.currency}</span>
          {item.evaluation.reason && <small>{item.evaluation.reason}</small>}
        </article>)}</div>
        {page.nextCursor && <button type="button" disabled={busy} onClick={() => void next()}>{t("Trang tiếp theo", "Next page")}</button>}
      </>}
    {error && <p role="alert"><SystemText message={error} /></p>}
  </section>;
}
