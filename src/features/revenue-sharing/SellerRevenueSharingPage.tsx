import { SystemValue } from '@/features/platform/SystemText';
import { SystemText, useSystemMessages } from "../platform/SystemText";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatRevenueDate, revenueError, revenueSharingService, type CoursePreview, type RevenueCoursePage } from "../../services/revenue-sharing.service";
import { RevenueReportPanel } from "./RevenueShared";
import "./RevenueSharing.css";

function placementStatus(plan: CoursePreview["plans"][number]): string {
  if (plan.status === "scheduled") return plan.weight === 0 && plan.shareBps === 0 ? "Sắp ngừng tham gia" : "Sắp áp dụng";
  if (plan.isIncluded) return "Đang trong gói";
  return plan.isMatching ? "Phù hợp, chưa được đưa vào gói" : "Chưa được đưa vào gói";
}

export function SellerRevenueSharingPage() {
  const messageForUi = useSystemMessages();
  const [page, setPage] = useState(1);
  const [courses, setCourses] = useState<RevenueCoursePage | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [preview, setPreview] = useState<CoursePreview | null>(null);
  const [termsId, setTermsId] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const courseRequest = useRef(0);
  const previewRequest = useRef(0);
  const load = useCallback(async () => {
    const request = ++courseRequest.current; setLoading(true); setError("");
    try { const result = await revenueSharingService.courses(page); if (request === courseRequest.current) setCourses(result); }
    catch (failure) { if (request === courseRequest.current) { setCourses(null); setError(revenueError(failure)); } }
    finally { if (request === courseRequest.current) setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); return () => { courseRequest.current++; }; }, [load]);
  const select = useCallback(async (id: string) => {
    const request = ++previewRequest.current; setSelectedId(id); setPreview(null); setAccepted(false); setTermsId(""); setError(""); setPreviewLoading(true);
    try { const result = await revenueSharingService.previewCourse(id); if (request === previewRequest.current) { setPreview(result); setTermsId(result.terms[0]?.id ?? ""); } }
    catch (failure) { if (request === previewRequest.current) setError(revenueError(failure)); }
    finally { if (request === previewRequest.current) setPreviewLoading(false); }
  }, []);
  useEffect(() => () => { previewRequest.current++; }, []);
  async function participate(leave: boolean) {
    if (!preview || (!leave && (!accepted || !termsId))) return;
    const courseId = selectedId; setBusy(true); setError(""); setMessage("");
    try { if (leave) await revenueSharingService.leave(courseId); else await revenueSharingService.accept(courseId, termsId); setMessage(leave ? "Đã ngừng tham gia cho đơn mới. Đơn cũ giữ nguyên quyền học và phần chia." : "Đã đăng ký tham gia. Hệ thống tự xếp khóa theo các quy tắc của gói."); await load(); await select(courseId); }
    catch (failure) { setError(revenueError(failure)); }
    finally { setBusy(false); }
  }
  const term = preview?.terms.find(item => item.id === termsId);
  const acceptedTerm = preview?.terms.find(item => item.id === preview.participation?.termsId);
  return <div className="revenue-page"><header><h1><SystemText message={"Doanh thu và gói hội viên"} /></h1><p><SystemText message={"Xem điều khoản, các gói phù hợp và quản lý sự tham gia của từng khóa học."} /></p></header>{error && <div className="revenue-error" role="alert"><SystemText message={error} /> <button onClick={() => selectedId && !preview ? void select(selectedId) : void load()}><SystemText message="Thử lại" /></button></div>}{message && <p role="status">{message}</p>}<section className="revenue-panel" aria-busy={loading}><h2><SystemText message={"Khóa học của bạn"} /></h2>{loading && <p role="status"><SystemText message={"Đang tải khóa học…"} /></p>}{courses && (!courses.items.length ? <p><SystemText message={"Bạn chưa có khóa học để đăng ký tham gia."} /></p> : <><ul className="revenue-records">{courses.items.map(course => <li key={course.id}><strong>{course.title}</strong><span>{course.participationStatus === "active" ? <SystemText message={"Đang tham gia"} /> : <SystemText message={"Chưa tham gia"} />}</span><button disabled={busy || previewLoading} aria-pressed={selectedId === course.id} onClick={() => void select(course.id)}><SystemText message={"Xem gói và điều khoản"} /></button></li>)}</ul><nav className="revenue-actions" aria-label={messageForUi("Phân trang khóa học")}><button disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}><SystemText message={"Trang trước"} /></button><span><SystemText message={"Trang"} /> {page} / {Math.max(1, courses.totalPages)}</span><button disabled={loading || page >= courses.totalPages} onClick={() => setPage(p => p + 1)}><SystemText message={"Trang sau"} /></button></nav></>)}</section>{previewLoading && <p role="status"><SystemText message={"Đang xét các gói phù hợp…"} /></p>}{preview && <section className="revenue-panel"><h2>{preview.course.title}</h2><h3><SystemText message={"Các gói phù hợp và thay đổi sắp tới"} /></h3>{preview.plans.length ? <ul className="revenue-records">{preview.plans.map(plan => <li key={plan.policyId}><strong>{plan.displayName}</strong><span>{placementStatus(plan)}<SystemValue render={() => ((plan.status === "scheduled" || plan.isIncluded) && <> · {formatRevenueDate(plan.effectiveAt)}</>)} /></span><span>{!plan.isIncluded && plan.isMatching ? <SystemText message={"Dự kiến: "} /> : ""}<SystemText message={"Trọng số"} /> {plan.weight}/{plan.totalWeight} · {(plan.shareBps / 100).toFixed(2)}<SystemText message={"% quỹ người bán"} /></span><small><SystemText message={"Nền tảng giữ"} /> {(plan.platformFeeBps / 100).toFixed(2)}<SystemText message={"% tiền gói sau giảm giá."} /></small></li>)}</ul> : <p><SystemText message={"Chưa có gói phù hợp. Bạn vẫn có thể đăng ký; hệ thống sẽ xếp khóa khi có quy tắc khớp."} /></p>}{preview.participation?.status === "active" ? <>{acceptedTerm && <details><summary><SystemText message={"Điều khoản đã chấp nhận"} /></summary><article className="revenue-terms"><h3>{acceptedTerm.title}</h3><p>{acceptedTerm.body}</p></article></details>}<p><SystemText message={"Khóa đang tham gia. Thay đổi được gửi qua thông báo, không yêu cầu chấp nhận lại. Bạn có thể ngừng tham gia cho đơn mới."} /></p><button disabled={busy} onClick={() => void participate(true)}><SystemText message={"Ngừng tham gia cho đơn mới"} /></button></> : <><label><SystemText message={"Điều khoản tham gia"} /><select value={termsId} disabled={busy} onChange={e => { setTermsId(e.target.value); setAccepted(false); }}><option value=""><SystemText message={"Chọn điều khoản"} /></option>{preview.terms.slice(0, 1).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>{term && <article className="revenue-terms"><h3>{term.title}</h3><p>{term.body}</p></article>}<label className="revenue-check"><input type="checkbox" checked={accepted} disabled={!term || busy} onChange={e => setAccepted(e.target.checked)} /> <SystemText message={"Tôi đã đọc và chấp nhận điều khoản, việc tự xếp gói và các thay đổi được thông báo."} /></label><button className="revenue-primary" disabled={busy || !accepted || !termsId} onClick={() => void participate(false)}>{busy ? <SystemText message={"Đang xử lý…"} /> : <SystemText message={"Chấp nhận và tham gia"} />}</button>{!preview.terms.length && <p><SystemText message={"Admin chưa công bố điều khoản để đăng ký."} /></p>}</>}</section>}<RevenueReportPanel role="seller" /></div>;
}