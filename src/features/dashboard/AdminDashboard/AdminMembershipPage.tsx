import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Archive, Check, GitCompare, Layers3, Plus, Search, ShieldCheck } from "lucide-react";
import {
  adminMembershipService,
  getAdminMembershipErrorMessage,
  type EntitlementResetPeriod,
  type EntitlementValueType,
  type AvailableMembershipCourse,
  type MembershipPlan,
  type MembershipPlanInput,
  type MembershipPlanPage,
  type MembershipPlanVersion,
  type MembershipVersionInput,
  type ServiceEntitlementDefinition,
} from "../../../services/admin-membership.service";
import { MembershipVersionEditor } from "./MembershipVersionEditor";
import "./AdminMembershipPage.css";

const PAGE_SIZE = 20;

export function AdminMembershipPage() {
  const [page, setPage] = useState<MembershipPlanPage | null>(null);
  const [query, setQuery] = useState({ page: 1, pageSize: PAGE_SIZE, search: "", status: "" });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [editor, setEditor] = useState<"plan" | "version" | "definition" | null>(null);
  const [definitions, setDefinitions] = useState<ServiceEntitlementDefinition[]>([]);
  const [courses, setCourses] = useState<AvailableMembershipCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const load = useCallback(async (request = query) => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const [plans, entitlementPage, publishedCourses] = await Promise.all([
        adminMembershipService.listPlans({
          page: request.page,
          pageSize: request.pageSize,
          search: request.search || undefined,
          status: request.status ? request.status as "active" | "archived" : undefined,
        }),
        adminMembershipService.listEntitlementDefinitions(),
        adminMembershipService.listAvailableCourses(),
      ]);
      if (sequence !== requestSequence.current) return;
      setPage(plans);
      setDefinitions(entitlementPage.items);
      setCourses(publishedCourses.items);
      const selected = plans.items.find((plan) => plan.id === selectedPlanId) ?? plans.items[0] ?? null;
      setSelectedPlanId(selected?.id ?? null);
      setSelectedVersionId((current) => selected?.versions.some((version) => version.id === current) ? current : selected?.versions[0]?.id ?? null);
    } catch (loadError) {
      if (sequence === requestSequence.current) {
        setPage(null);
        setError(getAdminMembershipErrorMessage(loadError));
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [query, selectedPlanId]);

  useEffect(() => { void load(query); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPlan = page?.items.find((plan) => plan.id === selectedPlanId) ?? null;
  const selectedVersion = selectedPlan?.versions.find((version) => version.id === selectedVersionId) ?? selectedPlan?.versions[0] ?? null;

  function selectPlan(plan: MembershipPlan) {
    setSelectedPlanId(plan.id);
    setSelectedVersionId(plan.versions[0]?.id ?? null);
    setEditor(null);
  }

  function filter(event: FormEvent) {
    event.preventDefault();
    setQuery({ page: 1, pageSize: PAGE_SIZE, search: search.trim(), status });
  }

  async function create(input: MembershipPlanInput | MembershipVersionInput) {
    setBusy(true);
    setError(null);
    try {
      if (editor === "plan") await adminMembershipService.createPlan(input as MembershipPlanInput);
      else if (selectedPlan) await adminMembershipService.createVersion(selectedPlan.id, input);
      setEditor(null);
      await load(query);
    } catch (createError) {
      setError(getAdminMembershipErrorMessage(createError));
    } finally {
      setBusy(false);
    }
  }

  async function createDefinition(input: Parameters<typeof adminMembershipService.createEntitlementDefinition>[0]) {
    setBusy(true); setError(null);
    try {
      await adminMembershipService.createEntitlementDefinition(input);
      setEditor(null);
      await load(query);
    } catch (createError) { setError(getAdminMembershipErrorMessage(createError)); }
    finally { setBusy(false); }
  }

  async function transition(kind: "publish" | "archive-version" | "archive-plan") {
    if (!selectedPlan || (kind !== "archive-plan" && !selectedVersion)) return;
    const message = kind === "publish"
      ? "Xuất bản phiên bản này? Giá, quyền lợi và khóa học sẽ trở thành lịch sử bất biến."
      : kind === "archive-version"
        ? "Lưu trữ phiên bản đã xuất bản này? Các đơn hàng lịch sử vẫn giữ nguyên tham chiếu."
        : "Lưu trữ toàn bộ gói hội viên? Không thể thêm phiên bản mới sau thao tác này.";
    if (!window.confirm(message)) return;
    setBusy(true); setError(null);
    try {
      if (kind === "publish") await adminMembershipService.publishVersion(selectedVersion!.id);
      else if (kind === "archive-version") await adminMembershipService.archiveVersion(selectedVersion!.id);
      else await adminMembershipService.archivePlan(selectedPlan.id);
      await load(query);
    } catch (transitionError) {
      setError(getAdminMembershipErrorMessage(transitionError));
    } finally { setBusy(false); }
  }

  return (
    <div className="admin-membership-page">
      <header className="membership-hero">
        <div><p>Membership · immutable versions</p><h1>Gói hội viên</h1><span>Thiết kế quyền lợi linh hoạt; bảo toàn điều khoản đã mua và lịch sử đơn hàng.</span></div>
        <div className="membership-hero__actions"><button className="membership-button membership-button--quiet" onClick={() => setEditor("definition")} type="button"><Layers3 aria-hidden="true" /> Định nghĩa dịch vụ</button><button className="membership-button" onClick={() => setEditor("plan")} type="button"><Plus aria-hidden="true" /> Tạo gói</button></div>
      </header>

      <form className="membership-filters" onSubmit={filter}>
        <label><span>Tìm gói</span><span className="membership-search"><Search aria-hidden="true" /><input aria-label="Tìm gói hội viên" onChange={(event) => setSearch(event.target.value)} placeholder="Mã hoặc tên hiển thị" type="search" value={search} /></span></label>
        <label><span>Trạng thái</span><select aria-label="Trạng thái gói" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">Tất cả</option><option value="active">Đang hoạt động</option><option value="archived">Đã lưu trữ</option></select></label>
        <button className="membership-button" type="submit">Áp dụng</button>
      </form>

      {error ? <p className="membership-alert membership-alert--error" role="alert"><AlertTriangle aria-hidden="true" />{error}</p> : null}
      {editor === "definition" ? <EntitlementDefinitionEditor busy={busy} onCancel={() => setEditor(null)} onSubmit={createDefinition} /> : editor ? <MembershipVersionEditor busy={busy} onCancel={() => setEditor(null)} onSubmit={create} planCode={editor === "version" ? selectedPlan?.code : undefined} /> : (
        <div className="membership-layout">
          <section className="membership-panel" aria-label="Danh sách gói hội viên">
            <div className="membership-section-heading"><div><small>CATALOG</small><h2>Gói hội viên</h2></div><span>{page?.total ?? 0} gói</span></div>
            {loading ? <p aria-busy="true" role="status">Đang tải gói hội viên…</p> : null}
            {!loading && !page?.items.length ? <p className="membership-empty">Chưa có gói phù hợp.</p> : null}
            <div className="membership-plan-list">
              {page?.items.map((plan) => <button aria-label={`Xem gói ${plan.code}`} className={selectedPlan?.id === plan.id ? "membership-plan-card membership-plan-card--active" : "membership-plan-card"} key={plan.id} onClick={() => selectPlan(plan)} type="button"><span><strong>{plan.versions[0]?.displayName ?? plan.code}</strong><small>{plan.code} · {plan.versions.length} phiên bản</small></span><Status value={plan.status} /></button>)}
            </div>
            <Pagination page={page} loading={loading} onPage={(next) => setQuery((current) => ({ ...current, page: next }))} />
          </section>

          <section className="membership-panel membership-workspace" aria-label="Chi tiết gói hội viên">
            {selectedPlan && selectedVersion ? <PlanWorkspace
              busy={busy}
              courses={courses}
              definitions={definitions}
              onArchivePlan={() => void transition("archive-plan")}
              onArchiveVersion={() => void transition("archive-version")}
              onChanged={() => load(query)}
              onCreateVersion={() => setEditor("version")}
              onError={(message) => setError(message)}
              onPublish={() => void transition("publish")}
              onSelectVersion={setSelectedVersionId}
              plan={selectedPlan}
              version={selectedVersion}
            /> : <p className="membership-empty">Chọn một gói để xem cấu hình và lịch sử phiên bản.</p>}
          </section>
        </div>
      )}
    </div>
  );
}

function EntitlementDefinitionEditor({ busy, onCancel, onSubmit }: { busy: boolean; onCancel: () => void; onSubmit: (input: Parameters<typeof adminMembershipService.createEntitlementDefinition>[0]) => Promise<void> }) {
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [unitLabel, setUnitLabel] = useState("");
  const [valueType, setValueType] = useState<EntitlementValueType>("METERED");
  const [resetPeriod, setResetPeriod] = useState<EntitlementResetPeriod>("CALENDAR_MONTH");
  const [displayOrder, setDisplayOrder] = useState("0");
  function changeType(next: EntitlementValueType) {
    setValueType(next);
    setResetPeriod(next === "METERED" ? "CALENDAR_MONTH" : "NONE");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void onSubmit({ code: code.trim().toUpperCase(), displayName: displayName.trim(), description: description.trim() || null, unitLabel: unitLabel.trim() || null, valueType, resetPeriod, displayOrder: Number(displayOrder) });
  }
  return <form className="membership-editor" onSubmit={submit}><div className="membership-section-heading"><div><small>SERVICE CATALOG</small><h2>Định nghĩa quyền lợi dịch vụ</h2></div><button className="membership-button membership-button--quiet" onClick={onCancel} type="button">Hủy</button></div><p className="membership-editor__intro">Mã và kiểu giá trị là hợp đồng ổn định. Từng phiên bản gói sẽ chụp lại quota hoặc trạng thái tương ứng.</p><div className="membership-form-grid"><label><span>Mã dịch vụ</span><input aria-label="Mã dịch vụ" maxLength={64} onChange={(event) => setCode(event.target.value)} pattern="[A-Za-z][A-Za-z0-9_]{1,63}" required value={code} /></label><label><span>Tên hiển thị</span><input aria-label="Tên dịch vụ" maxLength={120} onChange={(event) => setDisplayName(event.target.value)} required value={displayName} /></label><label><span>Kiểu quyền lợi</span><select aria-label="Kiểu quyền lợi" onChange={(event) => changeType(event.target.value as EntitlementValueType)} value={valueType}><option value="BOOLEAN">Bật / tắt</option><option value="METERED">Có quota</option><option value="UNLIMITED">Không giới hạn</option></select></label><label><span>Chu kỳ đặt lại</span><select aria-label="Chu kỳ đặt lại" disabled={valueType !== "METERED"} onChange={(event) => setResetPeriod(event.target.value as EntitlementResetPeriod)} value={resetPeriod}><option value="NONE">Không đặt lại</option><option value="CALENDAR_MONTH">Theo tháng dương lịch</option><option value="MEMBERSHIP_TERM">Theo kỳ hội viên</option></select></label><label><span>Nhãn đơn vị</span><input aria-label="Nhãn đơn vị" maxLength={40} onChange={(event) => setUnitLabel(event.target.value)} value={unitLabel} /></label><label><span>Thứ tự hiển thị</span><input aria-label="Thứ tự hiển thị dịch vụ" max="1000" min="0" onChange={(event) => setDisplayOrder(event.target.value)} required type="number" value={displayOrder} /></label><label className="membership-form-grid__wide"><span>Mô tả</span><textarea aria-label="Mô tả dịch vụ" maxLength={500} onChange={(event) => setDescription(event.target.value)} rows={3} value={description} /></label></div><div className="membership-editor__actions"><button className="membership-button" disabled={busy} type="submit"><Check aria-hidden="true" />{busy ? "Đang tạo…" : "Tạo định nghĩa"}</button></div></form>;
}

function PlanWorkspace({ plan, version, definitions, courses, busy, onSelectVersion, onCreateVersion, onPublish, onArchiveVersion, onArchivePlan, onChanged, onError }: {
  plan: MembershipPlan; version: MembershipPlanVersion; definitions: ServiceEntitlementDefinition[]; courses: AvailableMembershipCourse[]; busy: boolean;
  onSelectVersion: (id: string) => void; onCreateVersion: () => void; onPublish: () => void; onArchiveVersion: () => void; onArchivePlan: () => void; onChanged: () => Promise<void>; onError: (message: string) => void;
}) {
  const previous = plan.versions.find((candidate) => candidate.versionNumber < version.versionNumber) ?? null;
  const highDiscount = version.durationOptions.some((item) => (item.discountPercent ?? 0) >= 50);
  const isDraft = version.status === "DRAFT";
  return <div className="membership-workspace__content">
    <div className="membership-workspace__top">
      <div><small>{plan.code}</small><h2>{version.displayName}</h2><p>{version.description || "Không có mô tả."}</p></div>
      <Status value={version.status} />
    </div>
    <div className="membership-version-tabs" aria-label="Lịch sử phiên bản" role="tablist">{plan.versions.map((item) => <button aria-selected={item.id === version.id} key={item.id} onClick={() => onSelectVersion(item.id)} role="tab" type="button">v{item.versionNumber}<Status value={item.status} /></button>)}</div>
    <div className="membership-actions">
      {plan.status === "ACTIVE" ? <button className="membership-button membership-button--quiet" onClick={onCreateVersion} type="button"><Plus aria-hidden="true" /> Phiên bản mới</button> : null}
      {isDraft ? <button className="membership-button" disabled={busy} onClick={onPublish} type="button"><Check aria-hidden="true" /> Xuất bản bất biến</button> : null}
      {version.status === "PUBLISHED" ? <button className="membership-button membership-button--danger" disabled={busy} onClick={onArchiveVersion} type="button"><Archive aria-hidden="true" /> Lưu trữ phiên bản</button> : null}
      {plan.status === "ACTIVE" ? <button className="membership-button membership-button--danger" disabled={busy} onClick={onArchivePlan} type="button"><Archive aria-hidden="true" /> Lưu trữ gói</button> : null}
    </div>
    {highDiscount ? <p className="membership-alert membership-alert--warning"><AlertTriangle aria-hidden="true" />Phiên bản có mức giảm từ 50% trở lên. Không có trần nhân tạo; hãy đối chiếu giá hiệu lực trước khi xuất bản.</p> : null}
    <VersionFacts version={version} />
    <VersionComparison current={version} previous={previous} />
    <Configuration version={version} definitions={definitions} courses={courses} onChanged={onChanged} onError={onError} />
    <p className="membership-safety-note"><ShieldCheck aria-hidden="true" />Các phiên bản đã xuất bản và tham chiếu của người mua không thể bị sửa ngầm. Thay đổi mới phải tạo phiên bản mới.</p>
  </div>;
}

function VersionFacts({ version }: { version: MembershipPlanVersion }) {
  return <section className="membership-facts" aria-label="Điều khoản phiên bản"><div><span>Giá tháng cơ sở</span><strong>{formatMoney(version.baseMonthlyPriceAmountMinor)}</strong></div><div><span>Cửa sổ bán</span><strong>{formatWindow(version.salesStartAt, version.salesEndAt)}</strong></div><div><span>Quyền lợi dịch vụ</span><strong>{version.serviceEntitlements.length}</strong></div><div><span>Khóa học kèm theo</span><strong>{version.includedCourses.length}</strong></div><div className="membership-facts__wide"><span>Thời hạn và giá hiệu lực</span><div className="membership-chip-list">{version.durationOptions.map((item) => <em key={item.id}>{item.months} tháng · {formatMoney(item.effectivePriceAmountMinor)}{item.discountPercent !== null ? ` · giảm ${item.discountPercent}%` : ""}</em>)}</div></div></section>;
}

function VersionComparison({ current, previous }: { current: MembershipPlanVersion; previous: MembershipPlanVersion | null }) {
  const changes = useMemo(() => compareVersions(current, previous), [current, previous]);
  return <section className="membership-comparison" aria-labelledby="membership-comparison-title"><div className="membership-section-heading"><div><small>REVIEW</small><h3 id="membership-comparison-title"><GitCompare aria-hidden="true" /> So sánh phiên bản</h3></div>{previous ? <span>v{previous.versionNumber} → v{current.versionNumber}</span> : <span>Phiên bản đầu tiên</span>}</div><ul>{changes.map((change) => <li key={change}>{change}</li>)}</ul></section>;
}

function Configuration({ version, definitions, courses, onChanged, onError }: { version: MembershipPlanVersion; definitions: ServiceEntitlementDefinition[]; courses: AvailableMembershipCourse[]; onChanged: () => Promise<void>; onError: (message: string) => void }) {
  const [definitionId, setDefinitionId] = useState("");
  const [value, setValue] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [courseOptions, setCourseOptions] = useState(courses);
  const [graceDays, setGraceDays] = useState("0");
  const [busy, setBusy] = useState(false);
  const availableDefinitions = definitions.filter((item) => !version.serviceEntitlements.some((configured) => configured.definition.id === item.id));
  useEffect(() => setCourseOptions(courses), [courses]);
  const availableCourses = courseOptions.filter((item) => !version.includedCourses.some((configured) => configured.course.id === item.id));
  const selectedDefinition = definitions.find((item) => item.id === definitionId);
  if (version.status !== "DRAFT") return <ReadOnlyConfiguration version={version} />;
  async function configureEntitlement(event: FormEvent) {
    event.preventDefault(); if (!selectedDefinition) return; setBusy(true);
    try {
      const input = selectedDefinition.valueType === "BOOLEAN" ? { definitionId, booleanValue: value !== "false" } : selectedDefinition.valueType === "METERED" ? { definitionId, quota: value } : { definitionId };
      await adminMembershipService.configureEntitlement(version.id, input); setDefinitionId(""); setValue(""); await onChanged();
    } catch (error) { onError(getAdminMembershipErrorMessage(error)); } finally { setBusy(false); }
  }
  async function includeCourse(event: FormEvent) {
    event.preventDefault(); const grace = Number(graceDays); if (!courseId || !Number.isInteger(grace) || grace < 0 || grace > 3650) return;
    setBusy(true); try { await adminMembershipService.includeCourse(version.id, { courseId, graceDays: grace }); setCourseId(""); setGraceDays("0"); await onChanged(); } catch (error) { onError(getAdminMembershipErrorMessage(error)); } finally { setBusy(false); }
  }
  async function searchCourses() {
    setBusy(true);
    try { const result = await adminMembershipService.listAvailableCourses(courseSearch.trim() || undefined); setCourseOptions(result.items); setCourseId(""); }
    catch (error) { onError(getAdminMembershipErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <section className="membership-config"><div className="membership-section-heading"><div><small>DRAFT ONLY</small><h3><Layers3 aria-hidden="true" /> Cấu hình quyền lợi</h3></div></div><div className="membership-config__grid"><form onSubmit={(event) => void configureEntitlement(event)}><h4>Dịch vụ / quota</h4><label><span>Định nghĩa quyền lợi</span><select aria-label="Định nghĩa quyền lợi" onChange={(event) => { setDefinitionId(event.target.value); setValue(""); }} required value={definitionId}><option value="">Chọn quyền lợi</option>{availableDefinitions.map((item) => <option key={item.id} value={item.id}>{item.displayName} · {item.valueType}</option>)}</select></label>{selectedDefinition?.valueType === "BOOLEAN" ? <label><span>Cho phép</span><select aria-label="Giá trị quyền lợi" onChange={(event) => setValue(event.target.value)} value={value || "true"}><option value="true">Có</option><option value="false">Không</option></select></label> : null}{selectedDefinition?.valueType === "METERED" ? <label><span>Hạn mức ({selectedDefinition.unitLabel || "đơn vị"})</span><input aria-label="Hạn mức quyền lợi" min="1" onChange={(event) => setValue(event.target.value)} required type="number" value={value} /></label> : null}<button className="membership-button membership-button--quiet" disabled={busy || !definitionId} type="submit"><Plus aria-hidden="true" /> Thêm quyền lợi</button><ConfiguredEntitlements version={version} /></form><form onSubmit={(event) => void includeCourse(event)}><h4>Khóa học và grace</h4><div className="membership-inline-search"><input aria-label="Tìm khóa học kèm theo" onChange={(event) => setCourseSearch(event.target.value)} placeholder="Tên hoặc slug" type="search" value={courseSearch} /><button aria-label="Tìm trong khóa học khả dụng" className="membership-button membership-button--quiet" disabled={busy} onClick={() => void searchCourses()} type="button"><Search aria-hidden="true" /></button></div><label><span>Khóa học đã xuất bản</span><select aria-label="Khóa học kèm theo" onChange={(event) => setCourseId(event.target.value)} required value={courseId}><option value="">Chọn khóa học</option>{availableCourses.map((course) => <option key={course.id} value={course.id}>{course.title} · {course.visibility}</option>)}</select></label><label><span>Grace sau khi loại khỏi phiên bản sau (ngày)</span><input aria-label="Số ngày grace" max="3650" min="0" onChange={(event) => setGraceDays(event.target.value)} required type="number" value={graceDays} /></label><button className="membership-button membership-button--quiet" disabled={busy || !courseId} type="submit"><Plus aria-hidden="true" /> Thêm khóa học</button><IncludedCourses version={version} /></form></div></section>;
}

function ReadOnlyConfiguration({ version }: { version: MembershipPlanVersion }) { return <section className="membership-config"><div className="membership-section-heading"><div><small>IMMUTABLE SNAPSHOT</small><h3>Quyền lợi đã xuất bản</h3></div></div><div className="membership-config__grid"><div><h4>Dịch vụ / quota</h4><ConfiguredEntitlements version={version} /></div><div><h4>Khóa học và grace</h4><IncludedCourses version={version} /></div></div></section>; }
function ConfiguredEntitlements({ version }: { version: MembershipPlanVersion }) { return version.serviceEntitlements.length ? <ul className="membership-config-list">{version.serviceEntitlements.map((item) => <li key={item.id}><strong>{item.definition.displayName}</strong><span>{item.quota ? `${item.quota} ${item.definition.unitLabel ?? "đơn vị"}` : item.booleanValue === null ? "Không giới hạn" : item.booleanValue ? "Có" : "Không"}</span></li>)}</ul> : <p className="membership-empty membership-empty--small">Chưa cấu hình dịch vụ.</p>; }
function IncludedCourses({ version }: { version: MembershipPlanVersion }) { return version.includedCourses.length ? <ul className="membership-config-list">{version.includedCourses.map((item) => <li key={item.id}><strong>{item.course.title}</strong><span>Grace {item.graceDays} ngày</span></li>)}</ul> : <p className="membership-empty membership-empty--small">Chưa kèm khóa học.</p>; }
function Status({ value }: { value: string }) { return <em className={`membership-status membership-status--${value.toLowerCase()}`}>{value.replace(/_/g, " ")}</em>; }
function Pagination({ page, loading, onPage }: { page: MembershipPlanPage | null; loading: boolean; onPage: (page: number) => void }) { if (!page || page.total === 0) return null; return <nav className="membership-pagination" aria-label="Phân trang gói hội viên"><span>Trang {page.page} / {Math.max(1, page.totalPages)}</span><div><button disabled={loading || page.page <= 1} onClick={() => onPage(page.page - 1)} type="button">Trước</button><button disabled={loading || page.page >= page.totalPages} onClick={() => onPage(page.page + 1)} type="button">Sau</button></div></nav>; }

function compareVersions(current: MembershipPlanVersion, previous: MembershipPlanVersion | null) {
  if (!previous) return ["Thiết lập điều khoản đầu tiên; chưa có phiên bản trước để đối chiếu."];
  const changes: string[] = [];
  if (current.displayName !== previous.displayName) changes.push(`Tên hiển thị: “${previous.displayName}” → “${current.displayName}”`);
  if (current.baseMonthlyPriceAmountMinor !== previous.baseMonthlyPriceAmountMinor) changes.push(`Giá tháng: ${formatMoney(previous.baseMonthlyPriceAmountMinor)} → ${formatMoney(current.baseMonthlyPriceAmountMinor)}`);
  if (current.salesStartAt !== previous.salesStartAt || current.salesEndAt !== previous.salesEndAt) changes.push(`Cửa sổ bán: ${formatWindow(previous.salesStartAt, previous.salesEndAt)} → ${formatWindow(current.salesStartAt, current.salesEndAt)}`);
  const durationBefore = previous.durationOptions.map((item) => `${item.months}:${item.effectivePriceAmountMinor}`).join("|");
  const durationAfter = current.durationOptions.map((item) => `${item.months}:${item.effectivePriceAmountMinor}`).join("|");
  if (durationBefore !== durationAfter) changes.push(`Tùy chọn thời hạn/giá: ${previous.durationOptions.length} → ${current.durationOptions.length}`);
  if (current.serviceEntitlements.length !== previous.serviceEntitlements.length) changes.push(`Quyền lợi dịch vụ: ${previous.serviceEntitlements.length} → ${current.serviceEntitlements.length}`);
  if (current.includedCourses.length !== previous.includedCourses.length) changes.push(`Khóa học kèm theo: ${previous.includedCourses.length} → ${current.includedCourses.length}`);
  return changes.length ? changes : ["Không phát hiện thay đổi điều khoản so với phiên bản trước."];
}
function formatMoney(value: string) { try { return `${BigInt(value).toLocaleString("vi-VN")} VND`; } catch { return `${value} VND`; } }
function formatWindow(start: string | null, end: string | null) { if (!start && !end) return "Không giới hạn"; const format = (value: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "mở"; return `${format(start)} → ${format(end)}`; }

export const membershipAdministrationTestHelpers = { compareVersions };
