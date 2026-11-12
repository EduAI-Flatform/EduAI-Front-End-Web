import { SystemValue } from '@/features/platform/SystemText';
import { SystemText } from "../platform/SystemText";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { activationInput, formatRevenueDate, percentToBasisPoints, revenueError, revenueSharingService, type NoticeMode, type RevenuePolicy, type RevenueState } from "../../services/revenue-sharing.service";
import { ActivationFields, RevenueReportPanel } from "./RevenueShared";
import { PlanPolicyEditor } from "./PlanPolicyEditor";
import "./RevenueSharing.css";

export function AdminRevenueSharingPage() {
  const [state, setState] = useState<RevenueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [fee, setFee] = useState("");
  const [mode, setMode] = useState<NoticeMode>("immediate");
  const [days, setDays] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++sequence.current; setLoading(true); setError("");
    try { const result = await revenueSharingService.state(); if (request === sequence.current) setState(result); }
    catch (failure) { if (request === sequence.current) { setState(null); setError(revenueError(failure)); } }
    finally { if (request === sequence.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load]);
  async function mutate(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); setMessage(success); setRefreshKey(value => value + 1); await load(); }
    catch (failure) { setError(revenueError(failure)); }
    finally { setBusy(false); }
  }
  function retail(event: FormEvent) { event.preventDefault(); void mutate(() => revenueSharingService.retailPolicy({ platformFeeBps: percentToBasisPoints(fee), ...activationInput(mode, days) }), "Đã thông báo và lưu chính sách phí bán lẻ."); }
  function terms(event: FormEvent) { event.preventDefault(); void mutate(async () => { await revenueSharingService.createTerms({ title: title.trim(), body: body.trim() }); setTitle(""); setBody(""); }, "Đã tạo phiên bản điều khoản."); }
  const policies = state ? [...state.retailPolicies, ...state.planPolicies] : [];
  return <div className="revenue-page"><header><h1><SystemText message={"Phí và chia doanh thu"} /></h1><p><SystemText message={"Cấu hình tỷ lệ nền tảng, điều khoản tham gia và phân bổ cho người bán."} /></p></header>{error && <div className="revenue-error" role="alert"><SystemText message={error} /> <button onClick={() => void load()}><SystemText message="Thử lại" /></button></div>}{message && <p role="status">{message}</p>}{loading && <p role="status"><SystemText message={"Đang tải cấu hình…"} /></p>}{state && <><div className="revenue-grid revenue-columns"><section className="revenue-panel"><h2><SystemText message={"Phí bán lẻ toàn hệ thống"} /></h2><p><SystemText message={"Tính trên giá khóa học sau giảm giá. Không trừ thêm phí cổng thanh toán."} /></p><form onSubmit={retail}><fieldset disabled={busy}><label><SystemText message={"Tỷ lệ nền tảng (%)"} /><input type="number" required min="0" max="100" step="0.01" value={fee} onChange={e => setFee(e.target.value)} /></label><ActivationFields mode={mode} days={days} onChange={(next, value) => { setMode(next); setDays(value); }} /><button className="revenue-primary" type="submit">{busy ? <SystemText message={"Đang lưu…"} /> : <SystemText message={"Lưu chính sách bán lẻ"} />}</button></fieldset></form></section><section className="revenue-panel"><h2><SystemText message={"Phiên bản điều khoản"} /></h2><p><SystemText message={"Nội dung phải giải thích quyền ngừng tham gia, tự xếp gói và thay đổi qua thông báo."} /></p><form onSubmit={terms}><fieldset disabled={busy}><label><SystemText message="Tiêu đề" /><input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} /></label><label><SystemText message={"Nội dung điều khoản"} /><textarea required maxLength={30000} rows={7} value={body} onChange={e => setBody(e.target.value)} /></label><button type="submit"><SystemText message={"Tạo phiên bản điều khoản"} /></button></fieldset></form><details><summary><SystemText message={"Điều khoản đã tạo ("} />{state.terms.length})</summary>{state.terms.map(term => <article key={term.id}><h3>{term.title}</h3><p className="revenue-terms">{term.body}</p></article>)}</details></section></div><PlanPolicyEditor state={state} onSaved={async () => { setMessage("Đã thông báo và lưu chính sách member."); await load(); }} /><section className="revenue-panel"><h2><SystemText message={"Lịch sử và thay đổi sắp áp dụng"} /></h2>{!policies.length ? <p><SystemText message={"Chưa cấu hình chính sách. Không áp dụng tỷ lệ mặc định cho đơn cũ."} /></p> : <ul className="revenue-records">{policies.map((policy: RevenuePolicy) => <li key={policy.id}><strong>{policy.planId ? `Member · ${state.plans.find(p => p.id === policy.planId)?.code ?? policy.planId}` : <SystemText message={"Bán lẻ"} />}</strong><span><SystemText message={"Nền tảng"} /> {(policy.platformFeeBps / 100).toFixed(2)}% · {policy.status === "active" ? <SystemText message={"Đang áp dụng"} /> : policy.status === "scheduled" ? <SystemText message={"Đã lên lịch"} /> : policy.status === "cancelled" ? <SystemText message={"Đã hủy"} /> : <SystemText message={"Đã thay thế"} />}</span><small><SystemText message={"Hiệu lực:"} /> <SystemValue render={() => (formatRevenueDate(policy.effectiveAt))} /></small>{policy.status === "scheduled" && <button disabled={busy} onClick={() => void mutate(() => revenueSharingService.cancelPolicy(policy.id), "Đã hủy thay đổi chưa có hiệu lực.")}><SystemText message={"Hủy lịch thay đổi"} /></button>}</li>)}</ul>}</section></>}<RevenueReportPanel role="admin" refreshKey={refreshKey} /><p className="revenue-note"><SystemText message={"Đơn cũ giữ nguyên điều khoản. Báo cáo không thực hiện chuyển tiền cho người bán."} /></p></div>;
}