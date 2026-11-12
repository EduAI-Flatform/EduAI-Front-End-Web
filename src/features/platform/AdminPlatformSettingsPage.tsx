import { SystemText } from '@/features/platform/SystemText';
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  platformSettingsService,
  type PolicyPreview,
  type PolicyRevision,
  type PolicyState,
} from "../../services/platform-settings.service";
import {
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_GROUPS,
  type PlatformGroup,
} from "./platform.defaults";
import { usePlatform } from "./PlatformProvider";
import { PlatformSettingsForm } from "./PlatformSettingsForm";
import { MembershipImpactPanel } from './MembershipImpactPanel';
import "./PlatformSettings.css";

const groupNames: Record<PlatformGroup, [string, string]> = {
  branding: ["Thương hiệu", "Branding"],
  navigation: ["Điều hướng", "Navigation"],
  membership: ["Thẻ thành viên", "Membership cards"],
  points: ["Điểm thưởng", "Points"],
  partners: ["Đối tác", "Partners"],
  affiliate: ["Affiliate", "Affiliate"],
  courses: ["Khóa học", "Courses"],
  operations: ["Vận hành", "Operations"],
};
export function AdminPlatformSettingsPage() {
  const [searchParams] = useSearchParams();
  const requestedGroup = searchParams.get('group');
  const initialGroup: PlatformGroup = PLATFORM_GROUPS.find(value => value === requestedGroup) ?? 'branding';
  const { t, locale } = usePlatform();
  const [state, setState] = useState<PolicyState | null>(null);
  const [group, setGroup] = useState<PlatformGroup>(initialGroup);
  const [content, setContent] = useState<unknown>(
    DEFAULT_PLATFORM_SETTINGS[initialGroup],
  );
  const [selected, setSelected] = useState<PolicyRevision | null>(null);
  const [preview, setPreview] = useState<PolicyPreview | null>(null);
  const [effectiveAt, setEffectiveAt] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const next = PLATFORM_GROUPS.find(value => value === requestedGroup);
    if (next) chooseGroup(next);
  }, [requestedGroup]);
  const load = async () => {
    const next = await platformSettingsService.state();
    setState(next);
    return next;
  };
  useEffect(() => {
    let active = true;
    platformSettingsService
      .state()
      .then((next) => {
        if (active) {
          setState(next);
          setContent(next.settings[initialGroup]);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : t("Không tải được cấu hình.", "Unable to load configuration."),
          );
      });
    return () => {
      active = false;
    };
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("Thao tác thất bại.", "Action failed."),
      );
    } finally {
      setBusy(false);
    }
  }
  function chooseGroup(next: PlatformGroup) {
    setGroup(next);
    setContent(state?.settings[next] ?? DEFAULT_PLATFORM_SETTINGS[next]);
    setSelected(null);
    setPreview(null);
    setNotice("");
  }
  const rows = state?.revisions.filter((r) => r.group === group) ?? [];
  const dirty = selected
    ? JSON.stringify(selected.content) !== JSON.stringify(content)
    : true;
  return (
    <section className="platform-settings">
      <header>
        <h1>{t("Cấu hình nền tảng", "Platform configuration")}</h1>
        <p>
          {t(
            "Quản lý nội dung và chính sách GDS theo phiên bản và ngày hiệu lực.",
            "Manage GDS content and policies with revisions and effective dates.",
          )}
        </p>
      </header>
      {error && (
        <p role="alert" className="platform-settings__error">
          <SystemText message={error} />
        </p>
      )}
      {notice && <p role="status"><SystemText message={notice} /></p>}
      {!state ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const next = await load();
              setContent(next.settings[group]);
            })
          }
        >
          {t("Tải lại cấu hình", "Reload configuration")}
        </button>
      ) : (
        <>
          <label className="platform-settings__group">
            {t("Nhóm cấu hình", "Configuration group")}
            <select
              value={group}
              onChange={(e) => chooseGroup(e.target.value as PlatformGroup)}
            >
              {PLATFORM_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {t(...groupNames[g])}
                </option>
              ))}
            </select>
          </label>
          <div className="platform-settings__grid">
            <div className="platform-settings__panel">
              <h2>{t(...groupNames[group])}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    const revision = await platformSettingsService.create(
                      group,
                      content,
                    );
                    setSelected(revision);
                    setPreview(null);
                    await load();
                    setNotice(t("Đã lưu bản nháp.", "Draft saved."));
                  });
                }}
              >
                <PlatformSettingsForm
                  field={group}
                  label={t(...groupNames[group])}
                  value={content}
                  onChange={(next) => {
                    setContent(next);
                    setPreview(null);
                  }}
                />
                <button
                  className="platform-settings__primary"
                  disabled={busy}
                  type="submit"
                >
                  {t("Lưu bản nháp mới", "Save new draft")}
                </button>
              </form>
              {group === "branding" && (
                <div className="platform-settings__brand-preview">
                  <h3>{t("Xem trước nội dung", "Content preview")}</h3>
                  <div className="platform-settings__asset-preview">
                    {(['logoUrl', 'heroImageUrl', 'mascotUrl', 'pointImageUrl'] as const).map(key => {
                      const url = (content as typeof DEFAULT_PLATFORM_SETTINGS.branding)[key];
                      return url ? <img key={key} src={url} alt={key} loading="lazy" /> : null;
                    })}
                  </div>
                  <strong>
                    {
                      (content as typeof DEFAULT_PLATFORM_SETTINGS.branding)
                        .heroTitle?.[locale]
                    }
                  </strong>
                  <p>
                    {
                      (content as typeof DEFAULT_PLATFORM_SETTINGS.branding)
                        .heroDescription?.[locale]
                    }
                  </p>
                </div>
              )}
            </div>
            <aside className="platform-settings__panel">
              <h2>{t("Lịch sử phiên bản", "Revision history")}</h2>
              {!rows.length && (
                <p>
                  {t(
                    "Chưa có phiên bản. Cấu hình mặc định đang được dùng.",
                    "No revisions. Default configuration is in use.",
                  )}
                </p>
              )}
              {rows.map((row) => (
                <button
                  type="button"
                  className="platform-settings__revision"
                  aria-pressed={selected?.id === row.id}
                  key={row.id}
                  onClick={() => {
                    setSelected(row);
                    setContent(row.content);
                    setPreview(null);
                  }}
                >
                  <strong>
                    v{row.version} · {row.status}
                  </strong>
                  <span>
                    {new Date(row.createdAt).toLocaleString(
                      locale === "vi" ? "vi-VN" : "en-US",
                    )}
                  </span>
                  <small>
                    {t("Người tạo", "Created by")}: {row.createdById}
                  </small>
                  {row.effectiveAt && (
                    <small>
                      {t("Hiệu lực", "Effective")}:{" "}
                      {new Date(row.effectiveAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                    </small>
                  )}
                  {state.versions[group] === row.id && (
                    <strong>{t("Đang áp dụng", "Active")}</strong>
                  )}
                </button>
              ))}
              <Link to="/admin/dashboard/audit-logs">
                {t("Xem nhật ký thay đổi", "View audit log")}
              </Link>
            </aside>
          </div>
          {selected && (
            <section className="platform-settings__panel">
              <h2>
                {t("Kiểm tra và phê duyệt", "Review and approve")} · v
                {selected.version}
              </h2>
              {dirty && (
                <p>
                  {t(
                    "Nội dung đã thay đổi. Lưu bản nháp mới trước khi duyệt.",
                    "Content changed. Save a new draft before approval.",
                  )}
                </p>
              )}
              <div className="platform-form__row">
                <button
                  disabled={busy || dirty}
                  onClick={() =>
                    void run(async () =>
                      setPreview(
                        await platformSettingsService.preview(selected.id),
                      ),
                    )
                  }
                >
                  {t("Xem trước ảnh hưởng", "Preview impact")}
                </button>
                <button
                  disabled={
                    busy || dirty || !preview || selected.status !== "draft"
                  }
                  onClick={() =>
                    void run(async () => {
                      setSelected(
                        await platformSettingsService.approve(selected.id),
                      );
                      await load();
                    })
                  }
                >
                  {t("Duyệt bản nháp", "Approve draft")}
                </button>
                {selected.status !== "cancelled" &&
                  state.versions[group] !== selected.id && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await platformSettingsService.cancel(selected.id);
                          setSelected(null);
                          setPreview(null);
                          await load();
                        })
                      }
                    >
                      {t("Hủy phiên bản", "Cancel revision")}
                    </button>
                  )}
              </div>
              {preview && (
                <div role="status">
                  <p>
                    {preview.changed
                      ? t(
                          "Có thay đổi so với phiên bản đang áp dụng.",
                          "Changes detected against the current version.",
                        )
                      : t("Nội dung không thay đổi.", "No content changes.")}
                  </p>
                  <p>
                    {t(
                      "Quyền học đã mua được giữ nguyên.",
                      "Purchased course access is preserved.",
                    )}
                  </p>
                  {preview.blockers.map((message) => (
                    <p key={message}>
                      {t(
                        "Chưa thể áp dụng: các điều kiện nghiệp vụ và đối soát chưa hoàn tất.",
                        "Activation unavailable: business and reconciliation prerequisites are not complete.",
                      )}
                    </p>
                  ))}
                  {preview.membershipImpact && <MembershipImpactPanel key={preview.revisionId} initial={preview.membershipImpact} />}
                  <details>
                    <summary>
                      {t("Đối chiếu trước / sau", "Compare before / after")}
                    </summary>
                    <div className="platform-settings__comparison">
                      <pre>{JSON.stringify(preview.before, null, 2)}</pre>
                      <pre>{JSON.stringify(preview.after, null, 2)}</pre>
                    </div>
                  </details>
                </div>
              )}
              <label className="platform-form__field">
                {t("Ngày giờ hiệu lực", "Effective date and time")}
                <input
                  type="datetime-local"
                  value={effectiveAt}
                  onChange={(e) => setEffectiveAt(e.target.value)}
                />
              </label>
              <button
                className="platform-settings__primary"
                disabled={
                  busy ||
                  dirty ||
                  !preview?.canSchedule ||
                  selected.status !== "approved" ||
                  !effectiveAt
                }
                onClick={() =>
                  void run(async () => {
                    setSelected(
                      await platformSettingsService.schedule(
                        selected.id,
                        new Date(effectiveAt).toISOString(),
                      ),
                    );
                    await load();
                    setNotice(
                      t("Đã đặt ngày hiệu lực.", "Effective date scheduled."),
                    );
                  })
                }
              >
                {t("Đặt lịch áp dụng", "Schedule activation")}
              </button>
              <p>
                {t(
                  "Để khôi phục phiên bản cũ, chọn nội dung cũ và lưu thành bản nháp mới.",
                  "To restore an earlier revision, select it and save its content as a new draft.",
                )}
              </p>
            </section>
          )}
        </>
      )}
    </section>
  );
}
