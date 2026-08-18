import { Award, Plus, Save, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  adminScholarshipService,
  getScholarshipErrorMessage,
  type Scholarship,
  type ScholarshipApplicationPage,
  type ScholarshipMutationInput,
  type ScholarshipPage,
} from "../../../services/scholarship.service";
import "./AdminScholarshipManagementPage.css";

type CampaignForm = {
  title: string; description: string; applicationMode: "application" | "automatic";
  benefitKind: "course_access" | "percentage_discount" | "fixed_credit";
  benefitValue: string; currency: string; startsAt: string; endsAt: string;
  quota: string; courseIds: string; categorySlugs: string; eligibleUserIds: string;
  status: "draft" | "active" | "paused" | "closed";
};

const emptyForm: CampaignForm = {
  title: "", description: "", applicationMode: "application", benefitKind: "course_access",
  benefitValue: "1", currency: "VND", startsAt: "2026-08-01T00:00", endsAt: "2026-09-01T00:00",
  quota: "", courseIds: "", categorySlugs: "", eligibleUserIds: "", status: "draft",
};

export function AdminScholarshipManagementPage() {
  const [page, setPage] = useState<ScholarshipPage | null>(null);
  const [selected, setSelected] = useState<Scholarship | null>(null);
  const [history, setHistory] = useState<ScholarshipApplicationPage | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try { setPage(await adminScholarshipService.list()); setError(null); }
    catch (requestError) { setError(getScholarshipErrorMessage(requestError)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function create() { setSelected(null); setHistory(null); setForm(emptyForm); setError(null); }
  async function select(campaign: Scholarship) {
    setSelected(campaign); setForm(toForm(campaign));
    try { setHistory(await adminScholarshipService.applications(campaign.id)); setError(null); }
    catch (requestError) { setError(getScholarshipErrorMessage(requestError)); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    try {
      const input = toInput(form);
      const saved = selected ? await adminScholarshipService.update(selected.id, input) : await adminScholarshipService.create(input);
      await load(); await select(saved);
    } catch (requestError) { setError(getScholarshipErrorMessage(requestError)); }
    finally { setSaving(false); }
  }

  return <div className="admin-scholarship-page">
    <header className="admin-scholarship-page__header"><div><p>Hỗ trợ học tập có kiểm soát</p><h1>Quản lý học bổng</h1><span>Eligibility, quota và lịch sử award được xác nhận ở backend.</span></div><button className="admin-scholarship-page__primary" onClick={create} type="button"><Plus aria-hidden="true" /> Tạo chiến dịch</button></header>
    {error ? <p className="admin-scholarship-page__error" role="alert">{error}</p> : null}
    <div className="admin-scholarship-page__grid">
      <section className="admin-scholarship-panel" aria-label="Danh sách chiến dịch"><div className="admin-scholarship-panel__heading"><div><Award aria-hidden="true" /><h2>Chiến dịch</h2></div><span>{page?.total ?? 0} campaign</span></div>{loading ? <p role="status">Đang tải chiến dịch...</p> : null}{!loading && !page?.items.length ? <p>Chưa có chiến dịch.</p> : null}<div className="admin-scholarship-list">{page?.items.map((item) => <button className={selected?.id === item.id ? "admin-scholarship-list__item admin-scholarship-list__item--active" : "admin-scholarship-list__item"} key={item.id} onClick={() => void select(item)} type="button"><span><strong>{item.title}</strong><small>{item.benefitKind} · {item.awardedCount}/{item.quota ?? "∞"}</small></span><em>{item.status}</em></button>)}</div></section>
      <section className="admin-scholarship-panel" aria-label="Biểu mẫu học bổng"><div className="admin-scholarship-panel__heading"><div><ShieldCheck aria-hidden="true" /><h2>{selected?.title ?? "Tạo chiến dịch"}</h2></div></div><form className="admin-scholarship-form" onSubmit={save}><label>Tiêu đề<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Mô tả<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="admin-scholarship-form__split"><label>Mode<select value={form.applicationMode} onChange={(e) => setForm({ ...form, applicationMode: e.target.value as CampaignForm["applicationMode"] })}><option value="application">Đăng ký</option><option value="automatic">Tự động</option></select></label><label>Quyền lợi<select value={form.benefitKind} onChange={(e) => setForm({ ...form, benefitKind: e.target.value as CampaignForm["benefitKind"] })}><option value="course_access">Quyền truy cập</option><option value="percentage_discount">Phần trăm</option><option value="fixed_credit">Tín dụng cố định</option></select></label><label>Giá trị<input required min="0" type="number" value={form.benefitValue} onChange={(e) => setForm({ ...form, benefitValue: e.target.value })} /></label></div><div className="admin-scholarship-form__split"><label>Bắt đầu<input required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label><label>Kết thúc<input required type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></label><label>Quota<input min="1" type="number" value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} /></label><label>Trạng thái<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CampaignForm["status"] })}><option value="draft">Nháp</option><option value="active">Đang mở</option><option value="paused">Tạm dừng</option><option value="closed">Đã đóng</option></select></label></div><label>Course IDs<small>Phân cách bằng dấu phẩy</small><input value={form.courseIds} onChange={(e) => setForm({ ...form, courseIds: e.target.value })} /></label><label>Category slugs<input value={form.categorySlugs} onChange={(e) => setForm({ ...form, categorySlugs: e.target.value })} /></label><label>User IDs đủ điều kiện<input value={form.eligibleUserIds} onChange={(e) => setForm({ ...form, eligibleUserIds: e.target.value })} /></label><button className="admin-scholarship-page__primary" disabled={saving} type="submit"><Save aria-hidden="true" />{saving ? "Đang lưu..." : "Lưu chiến dịch"}</button></form></section>
    </div>
    {selected ? <section className="admin-scholarship-panel admin-scholarship-history" aria-label="Lịch sử ứng tuyển"><div className="admin-scholarship-panel__heading"><div><Award aria-hidden="true" /><h2>Lịch sử award</h2></div><span>{history?.total ?? 0} application</span></div>{!history?.items.length ? <p>Chưa có application.</p> : <table><thead><tr><th>User</th><th>Course</th><th>Status</th></tr></thead><tbody>{history.items.map((item) => <tr key={item.id}><td>{item.userId}</td><td>{item.courseId}</td><td>{item.status}</td></tr>)}</tbody></table>}</section> : null}
  </div>;
}

function toForm(item: Scholarship): CampaignForm { return { title: item.title, description: item.description ?? "", applicationMode: item.applicationMode, benefitKind: item.benefitKind, benefitValue: String(item.benefitValue), currency: item.currency ?? "VND", startsAt: item.startsAt.slice(0, 16), endsAt: item.endsAt.slice(0, 16), quota: String(item.quota ?? ""), courseIds: item.courseIds.join(", "), categorySlugs: item.categorySlugs.join(", "), eligibleUserIds: item.eligibleUserIds.join(", "), status: item.status }; }
function toInput(form: CampaignForm): ScholarshipMutationInput { const split = (value: string) => value.split(",").map((part) => part.trim()).filter(Boolean); return { title: form.title, description: form.description || null, applicationMode: form.applicationMode, benefitKind: form.benefitKind, benefitValue: Number(form.benefitValue), currency: form.benefitKind === "course_access" ? null : form.currency, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(), quota: form.quota.trim() ? Number(form.quota) : null, courseIds: split(form.courseIds), categorySlugs: split(form.categorySlugs), eligibleUserIds: split(form.eligibleUserIds), status: form.status }; }
