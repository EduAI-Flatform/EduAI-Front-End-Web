import { useMemo, useRef, useState, type FormEvent } from "react";
import { activationInput, percentToBasisPoints, revenueError, revenueSharingService, type NoticeMode, type PlanPolicyInput, type PolicyPreview, type RevenueRule, type RevenueState } from "../../services/revenue-sharing.service";
import { ActivationFields } from "./RevenueShared";
import { RevenueRuleEditor } from "./RevenueRuleEditor";

export function PlanPolicyEditor({ state, onSaved }: { state: RevenueState; onSaved: () => Promise<void> }) {
  const [planId, setPlanId] = useState("");
  const [termsId, setTermsId] = useState("");
  const [fee, setFee] = useState("");
  const [mode, setMode] = useState<NoticeMode>("immediate");
  const [days, setDays] = useState("");
  const [rules, setRules] = useState<RevenueRule[]>([{ priority: 0, weight: 1 }]);
  const [overrides, setOverrides] = useState<{ courseId: string; weight: number }[]>([]);
  const [preview, setPreview] = useState<PolicyPreview | null>(null);
  const [previewKey, setPreviewKey] = useState("");
  const [candidates, setCandidates] = useState<PolicyPreview["courses"]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const plan = state.plans.find(item => item.id === planId);
  const version = plan?.versions.filter(item => item.status === "published").sort((a, b) => b.versionNumber - a.versionNumber)[0];
  const input = useMemo((): PlanPolicyInput | null => {
    try {
      if (!version || !termsId || !rules.length) return null;
      for (const rule of rules) {
        if (!Number.isSafeInteger(rule.weight) || rule.weight < 1) return null;
        for (const price of [rule.minPriceAmountMinor, rule.maxPriceAmountMinor]) if (price !== undefined && !/^\d+$/.test(price)) return null;
        if (rule.minPriceAmountMinor !== undefined && rule.maxPriceAmountMinor !== undefined && BigInt(rule.minPriceAmountMinor) > BigInt(rule.maxPriceAmountMinor)) return null;
      }
      if (overrides.some(o => !o.courseId || !Number.isSafeInteger(o.weight) || o.weight < 1) || new Set(overrides.map(o => o.courseId)).size !== overrides.length) return null;
      return { planId, sourceVersionId: version.id, termsId, platformFeeBps: percentToBasisPoints(fee), rules: rules.map((rule, priority) => ({ ...rule, priority, categorySlugs: rule.categorySlugs?.map(v => v.trim()).filter(Boolean) })), overrides, ...activationInput(mode, days) };
    } catch { return null; }
  }, [planId, version, termsId, fee, rules, overrides, mode, days]);
  const currentKey = JSON.stringify(input);
  const validPreview = preview !== null && previewKey === currentKey;
  async function simulate(event: FormEvent) {
    event.preventDefault(); if (!input) return;
    const request = ++sequence.current; const key = currentKey;
    setBusy(true); setError(""); setPreview(null);
    try { const result = await revenueSharingService.previewPolicy(input); if (request === sequence.current) { setPreview(result); setPreviewKey(key); setCandidates(result.courses); } }
    catch (failure) { if (request === sequence.current) setError(revenueError(failure)); }
    finally { if (request === sequence.current) setBusy(false); }
  }
  async function save() {
    if (!input || !validPreview) return;
    setBusy(true); setError("");
    try { await revenueSharingService.schedulePolicy(input); setPreview(null); setPreviewKey(""); await onSaved(); }
    catch (failure) { setError(revenueError(failure)); }
    finally { setBusy(false); }
  }
  return <section className="revenue-panel"><h2>Chia doanh thu member</h2><p>Mỗi gói chia quỹ độc lập. Một khóa có thể thuộc nhiều gói; không giới hạn cứng số khóa.</p>{error && <p role="alert">{error}</p>}<form onSubmit={event => void simulate(event)}><fieldset disabled={busy}><div className="revenue-grid"><label>Gói hội viên<select required value={planId} onChange={e => { setPlanId(e.target.value); setOverrides([]); setCandidates([]); setPreview(null); }}><option value="">Chọn gói</option>{state.plans.filter(p => p.status === "active").map(p => <option key={p.id} value={p.id}>{p.code}</option>)}</select></label><label>Điều khoản<select required value={termsId} onChange={e => setTermsId(e.target.value)}><option value="">Chọn điều khoản</option>{state.terms.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label><label>Tỷ lệ nền tảng (%)<input type="number" min="0" max="100" step="0.01" required value={fee} onChange={e => setFee(e.target.value)} /></label></div>{plan && !version && <p role="status">Gói cần có phiên bản đã xuất bản trước khi bật chia doanh thu.</p>}{version && <p>Áp dụng trên {version.displayName} · phiên bản {version.versionNumber}. Hệ thống tạo phiên bản mới khi danh sách thay đổi.</p>}<RevenueRuleEditor rules={rules} onChange={setRules} /><section><h3>Trọng số riêng từng khóa</h3><p>Chạy xem trước để chọn khóa, sau đó xem trước lại nếu thay đổi trọng số.</p>{overrides.map((override, index) => <div className="revenue-grid" key={index}><label>Khóa học<select required value={override.courseId} onChange={e => setOverrides(items => items.map((o, i) => i === index ? { ...o, courseId: e.target.value } : o))}><option value="">Chọn khóa</option>{candidates.map(course => <option key={course.courseId} value={course.courseId}>{course.title}</option>)}</select></label><label>Trọng số riêng<input type="number" min="1" step="1" required value={override.weight} onChange={e => setOverrides(items => items.map((o, i) => i === index ? { ...o, weight: Number(e.target.value) } : o))} /></label><button type="button" onClick={() => setOverrides(items => items.filter((_, i) => i !== index))}>Xóa trọng số riêng</button></div>)}<button type="button" disabled={!candidates.length} onClick={() => setOverrides(items => [...items, { courseId: "", weight: 1 }])}>Thêm trọng số riêng</button></section><ActivationFields mode={mode} days={days} onChange={(next, value) => { setMode(next); setDays(value); }} /><button type="submit" disabled={!input}>{busy ? "Đang xử lý…" : "Xem trước tác động"}</button></fieldset></form>{validPreview && preview && <div className="revenue-preview"><h3>Kết quả xem trước</h3><p>{preview.courses.length} khóa · tổng trọng số {preview.previousTotalWeight ?? 0} → {preview.totalWeight} · {preview.affectedSellerCount} người bán bị ảnh hưởng.</p>{preview.courses.length ? <ul className="revenue-records">{preview.courses.map(course => <li key={course.courseId}><strong>{course.title}</strong><span>Trọng số {course.weight} · {((course.previousShareBps ?? 0) / 100).toFixed(2)}% → {(course.shareBps / 100).toFixed(2)}% quỹ người bán</span><small>Chủ khóa: {course.sellerId}</small></li>)}</ul> : <p>Chưa có khóa đã đăng ký tham gia khớp quy tắc.</p>}{!!preview.removedCourses?.length && <section><h3>Khóa sẽ ngừng có trong đơn mới</h3><ul className="revenue-records">{preview.removedCourses.map(course => <li key={course.courseId}><strong>{course.title}</strong><span>{(course.previousShareBps / 100).toFixed(2)}% → 0.00% quỹ người bán</span><small>Chủ khóa: {course.sellerId}. Đơn cũ giữ nguyên phần chia.</small></li>)}</ul></section>}</div>}{preview && !validPreview && <p role="status">Cấu hình đã thay đổi. Cần xem trước lại trước khi áp dụng.</p>}<button className="revenue-primary" disabled={busy || !input || !validPreview} onClick={() => void save()}>{mode === "immediate" ? "Thông báo và áp dụng" : "Thông báo và lên lịch"}</button></section>;
}