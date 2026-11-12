import { SystemValue } from '@/features/platform/SystemText';
import { SystemText, useSystemMessages } from "../platform/SystemText";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { formatRevenueDate, formatRevenueMoney, revenueError, revenueSharingService, type NoticeMode, type RevenueReport } from "../../services/revenue-sharing.service";

export function ActivationFields({ mode, days, onChange }: { mode: NoticeMode; days: string; onChange: (mode: NoticeMode, days: string) => void }) {
  const id = useId();
  const noticeDays = Number(days);
  const estimatedDate = mode === "delayed" && Number.isSafeInteger(noticeDays) && noticeDays > 0 && noticeDays <= 3650 ? formatRevenueDate(new Date(Date.now() + noticeDays * 86400000).toISOString()) : null;
  return <fieldset className="revenue-activation"><legend><SystemText message={"Thời điểm áp dụng"} /></legend><label><input type="radio" name={id} checked={mode === "immediate"} onChange={() => onChange("immediate", days)} /> <SystemText message={"Áp dụng ngay sau thông báo"} /></label><label><input type="radio" name={id} checked={mode === "delayed"} onChange={() => onChange("delayed", days)} /> <SystemText message={"Báo trước"} /></label>{mode === "delayed" && <label><SystemText message={"Số ngày báo trước"} /><input type="number" min="1" max="3650" step="1" required value={days} onChange={e => onChange(mode, e.target.value)} /></label>}{estimatedDate && <p><SystemText message={"Ngày hiệu lực dự kiến:"} /> {estimatedDate}<SystemText message={". Thời điểm chính xác được lưu khi gửi thông báo."} /></p>}<p><SystemText message={"Đơn đã tạo giữ nguyên điều khoản và tỷ lệ cũ."} /></p></fieldset>;
}
export function RevenueReportPanel({ role, refreshKey = 0 }: { role: "admin" | "seller"; refreshKey?: number }) {
  const messageForUi = useSystemMessages();
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true); setError("");
    try { const result = await revenueSharingService.report(role, page); if (request === sequence.current) setReport(result); }
    catch (failure) { if (request === sequence.current) { setReport(null); setError(revenueError(failure)); } }
    finally { if (request === sequence.current) setLoading(false); }
  }, [role, page, refreshKey]);
  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load]);
  return <section className="revenue-panel" aria-busy={loading}><h2><SystemText message={"Sổ doanh thu"} /></h2><p><SystemText message={"Khoản phân bổ theo đơn, chưa phải số dư có thể rút. Member được ghi nhận cuối mỗi tháng sử dụng."} /></p>{error && <div role="alert"><SystemText message={error} /> <button onClick={() => void load()}><SystemText message="Thử lại" /></button></div>}{loading && <p role="status"><SystemText message={"Đang tải doanh thu…"} /></p>}{report && <><dl className="revenue-metrics"><div><dt><SystemText message={"Chờ ghi nhận"} /></dt><dd><SystemValue render={() => (formatRevenueMoney(report.totals.pendingAmountMinor))} /></dd></div><div><dt><SystemText message={"Đã ghi nhận"} /></dt><dd><SystemValue render={() => (formatRevenueMoney(report.totals.recognizedAmountMinor))} /></dd></div><div><dt><SystemText message={"Điều chỉnh hoàn tiền"} /></dt><dd><SystemValue render={() => (formatRevenueMoney(report.totals.refundAdjustmentAmountMinor))} /></dd></div></dl>{!report.items.length ? <p><SystemText message={"Chưa có khoản doanh thu được phân bổ."} /></p> : <ul className="revenue-records">{report.items.map(item => <li key={item.id}><strong><SystemText message={"Đơn"} /> {item.orderId}</strong><dl>{role === "admin" && <div><dt><SystemText message={"Người bán"} /></dt><dd>{item.sellerId}</dd></div>}<div><dt><SystemText message="Khóa học" /></dt><dd>{item.courseId ?? <SystemText message={"Bán lẻ"} />}</dd></div><div><dt><SystemText message={"Ngày ghi nhận"} /></dt><dd><SystemValue render={() => (formatRevenueDate(item.dueAt))} /></dd></div><div><dt><SystemText message={"Chờ ghi nhận"} /></dt><dd><SystemValue render={() => (formatRevenueMoney(item.pendingAmountMinor))} /></dd></div><div><dt><SystemText message={"Đã ghi nhận"} /></dt><dd><SystemValue render={() => (formatRevenueMoney(item.recognizedAmountMinor))} /></dd></div><div><dt><SystemText message={"Điều chỉnh hoàn tiền"} /></dt><dd><SystemValue render={() => (formatRevenueMoney(item.refundAdjustmentAmountMinor))} /></dd></div></dl></li>)}</ul>}<nav className="revenue-actions" aria-label={messageForUi("Phân trang doanh thu")}><button disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}><SystemText message={"Trang trước"} /></button><span><SystemText message={"Trang"} /> {page} / {Math.max(1, report.totalPages)}</span><button disabled={loading || page >= report.totalPages} onClick={() => setPage(p => p + 1)}><SystemText message={"Trang sau"} /></button></nav></>}</section>;
}