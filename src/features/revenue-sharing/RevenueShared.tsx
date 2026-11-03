import { useCallback, useEffect, useId, useRef, useState } from "react";
import { formatRevenueDate, formatRevenueMoney, revenueError, revenueSharingService, type NoticeMode, type RevenueReport } from "../../services/revenue-sharing.service";

export function ActivationFields({ mode, days, onChange }: { mode: NoticeMode; days: string; onChange: (mode: NoticeMode, days: string) => void }) {
  const id = useId();
  const noticeDays = Number(days);
  const estimatedDate = mode === "delayed" && Number.isSafeInteger(noticeDays) && noticeDays > 0 && noticeDays <= 3650 ? formatRevenueDate(new Date(Date.now() + noticeDays * 86400000).toISOString()) : null;
  return <fieldset className="revenue-activation"><legend>Thời điểm áp dụng</legend><label><input type="radio" name={id} checked={mode === "immediate"} onChange={() => onChange("immediate", days)} /> Áp dụng ngay sau thông báo</label><label><input type="radio" name={id} checked={mode === "delayed"} onChange={() => onChange("delayed", days)} /> Báo trước</label>{mode === "delayed" && <label>Số ngày báo trước<input type="number" min="1" max="3650" step="1" required value={days} onChange={e => onChange(mode, e.target.value)} /></label>}{estimatedDate && <p>Ngày hiệu lực dự kiến: {estimatedDate}. Thời điểm chính xác được lưu khi gửi thông báo.</p>}<p>Đơn đã tạo giữ nguyên điều khoản và tỷ lệ cũ.</p></fieldset>;
}
export function RevenueReportPanel({ role, refreshKey = 0 }: { role: "admin" | "seller"; refreshKey?: number }) {
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
  return <section className="revenue-panel" aria-busy={loading}><h2>Sổ doanh thu</h2><p>Khoản phân bổ theo đơn, chưa phải số dư có thể rút. Member được ghi nhận cuối mỗi tháng sử dụng.</p>{error && <div role="alert">{error} <button onClick={() => void load()}>Thử lại</button></div>}{loading && <p role="status">Đang tải doanh thu…</p>}{report && <><dl className="revenue-metrics"><div><dt>Chờ ghi nhận</dt><dd>{formatRevenueMoney(report.totals.pendingAmountMinor)}</dd></div><div><dt>Đã ghi nhận</dt><dd>{formatRevenueMoney(report.totals.recognizedAmountMinor)}</dd></div><div><dt>Điều chỉnh hoàn tiền</dt><dd>{formatRevenueMoney(report.totals.refundAdjustmentAmountMinor)}</dd></div></dl>{!report.items.length ? <p>Chưa có khoản doanh thu được phân bổ.</p> : <ul className="revenue-records">{report.items.map(item => <li key={item.id}><strong>Đơn {item.orderId}</strong><dl>{role === "admin" && <div><dt>Người bán</dt><dd>{item.sellerId}</dd></div>}<div><dt>Khóa học</dt><dd>{item.courseId ?? "Bán lẻ"}</dd></div><div><dt>Ngày ghi nhận</dt><dd>{formatRevenueDate(item.dueAt)}</dd></div><div><dt>Chờ ghi nhận</dt><dd>{formatRevenueMoney(item.pendingAmountMinor)}</dd></div><div><dt>Đã ghi nhận</dt><dd>{formatRevenueMoney(item.recognizedAmountMinor)}</dd></div><div><dt>Điều chỉnh hoàn tiền</dt><dd>{formatRevenueMoney(item.refundAdjustmentAmountMinor)}</dd></div></dl></li>)}</ul>}<nav className="revenue-actions" aria-label="Phân trang doanh thu"><button disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}>Trang trước</button><span>Trang {page} / {Math.max(1, report.totalPages)}</span><button disabled={loading || page >= report.totalPages} onClick={() => setPage(p => p + 1)}>Trang sau</button></nav></>}</section>;
}