import { SystemText } from '@/features/platform/SystemText';
import { useState } from "react";
import { usePlatform } from "./PlatformProvider";
import { platformSettingsService, type MembershipImpact } from "../../services/platform-settings.service";
import { ServiceQuotaImpact } from './ServiceQuotaImpact';
import { quotaIssueText } from './service-quota-format';

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
    {page.status === "unavailable" && <p>{t('Chưa đủ dữ liệu xác minh để mô phỏng đầy đủ.', 'Verified data is insufficient for a complete simulation.')}</p>}
    {!page.complete && <p>{t('Đây là ảnh chụp dữ liệu chưa đầy đủ, không phải dự báo toàn bộ. Cần xem các trang còn lại và dữ liệu chưa xác minh.', 'This is a partial snapshot, not a complete forecast. Review remaining pages and unavailable data.')}</p>}
    {page.serviceConsumptionProjectionIssues?.length ? <ul>{[...new Set(page.serviceConsumptionProjectionIssues.map(issue => issue.reason))].map(reason =>
      <li key={reason}>{quotaIssueText(reason, t) ?? t('Chưa thể xác minh dữ liệu hạn mức.', 'Quota data could not be verified.')}</li>)}</ul> : null}
    <>
        <p>{t("Tài khoản đã xét trên trang", "Accounts evaluated on this page")} {page.evaluatedUsers ?? '—'} / {page.totalUsers ?? '—'}</p>
        <p>{t("Số tài khoản đổi hạng trên trang", "Projected tier changes on this page")} {page.projectedChangesOnPage ?? '—'}</p>
        <p>{t("Số tài khoản đổi quyền lợi trên trang", "Projected benefit changes on this page")} {page.projectedBenefitChangesOnPage ?? "—"}</p>
        {page.projectedServiceLimitChangesOnPage !== undefined && <p>{t('Số tài khoản đổi cấu hình hạn mức trên trang', 'Projected quota-configuration changes on this page')}: {page.projectedServiceLimitChangesOnPage}</p>}
        {page.serviceConsumptionProjected && page.projectedServiceRemainingChangesOnPage !== undefined && <p>{t('Số tài khoản đổi hạn mức còn lại trên trang', 'Projected remaining-quota changes on this page')}: {page.projectedServiceRemainingChangesOnPage}</p>}
        <div className="platform-impact__rows">{(page.items ?? []).map(item => <article key={item.userId}>
          <code>{item.userId}</code>
          <span>{item.previousTierCode ?? "—"} → {item.evaluation.tier?.name[locale] ?? item.evaluation.status}</span>
          <span>{item.evaluation.basis === 'topup' ? t("Nạp tiền đủ điều kiện", "Qualifying top-ups") : t("Chi tiêu đủ điều kiện", "Qualifying spending")} {item.evaluation.qualifyingAmountMinor ?? "—"} {item.evaluation.currency}</span>
          {item.projectedBenefitsChanged === true && <>
            <span>{t("Quyền lợi trước", "Previous benefits")}: {item.previousBenefits?.map(benefit => benefit[locale] || benefit.vi).join('; ') || "—"}</span>
            <span>{t("Quyền lợi sau", "New benefits")}: {item.evaluation.tier?.benefits.map(benefit => benefit[locale] || benefit.vi).join('; ') || "—"}</span>
          </>}
          {item.evaluation.reason && <small>{item.evaluation.reason}</small>}
          {(item.previousServiceQuota !== undefined || item.projectedServiceQuota !== undefined) && <ServiceQuotaImpact before={item.previousServiceQuota} after={item.projectedServiceQuota} />}
        </article>)}</div>
        {page.nextCursor && <button type="button" disabled={busy} onClick={() => void next()}>{t("Trang tiếp theo", "Next page")}</button>}
      </>
    {error && <p role="alert"><SystemText message={error} /></p>}
  </section>;
}
