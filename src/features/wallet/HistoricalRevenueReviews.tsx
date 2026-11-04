import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { formatGdsVnd } from '../../services/gds-wallet.service';
import { gdsWithdrawalService, isHistoricalPaidValid, withdrawalError, type RevenueReview, type RevenueReviewPage } from '../../services/gds-withdrawal.service';

export function HistoricalRevenueReviews({ actorId }: { actorId?: string }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RevenueReviewPage | null>(null);
  const [selected, setSelected] = useState<RevenueReview | null>(null);
  const [paid, setPaid] = useState('0');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const validPaid = isHistoricalPaidValid(paid, selected?.recognizedMinor);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await gdsWithdrawalService.revenueReviews(page)); }
    catch (cause) { setError(withdrawalError(cause)); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  async function approve(event: FormEvent) {
    event.preventDefault(); if (!selected || busy || !validPaid || !reason.trim()) return;
    setBusy(true); setError('');
    try { await gdsWithdrawalService.approveRevenueReview(selected.id, paid, reason.trim()); setSelected(null); await load(); }
    catch (cause) { setError(withdrawalError(cause)); }
    finally { setBusy(false); }
  }
  return <section className="withdrawal-panel"><h2>Đối soát doanh thu cũ</h2><p>Kiểm tra chứng từ trước khi xác nhận số tiền đã chi ngoài hệ thống. Chỉ phần doanh thu ròng chưa chi mới được cộng vào GDS; khoản chưa rõ tiếp tục chờ đối soát.</p>
    {error && !selected ? <p role="alert">{error}</p> : null}
    {loading ? <p role="status">Đang tải khoản cần đối soát…</p> : !data?.items.length ? <p>Chưa có khoản cần đối soát.</p> : <ul className="withdrawal-records">{data.items.map(item => <li key={item.id}>
      <div><strong>Doanh thu ròng: {formatGdsVnd(item.netMinor)}</strong><span>{item.reviewRequired ? 'Chờ đối soát' : 'Đã đối soát'}</span></div><p>Doanh thu đã ghi nhận ban đầu: {formatGdsVnd(item.recognizedMinor)}</p><p>Tài khoản: {item.ownerId}</p><p>Kỳ doanh thu: {item.periodId}</p><p>Đã chi ngoài hệ thống: {formatGdsVnd(item.historicalPaidMinor)}</p>
      <Button type="button" variant="outline" disabled={!item.reviewRequired || item.ownerId === actorId || busy} onClick={() => { setSelected(item); setPaid('0'); setReason(''); }}>Đối soát khoản này</Button>
    </li>)}</ul>}
    {data && data.totalPages > 1 ? <nav className="withdrawal-actions" aria-label="Phân trang doanh thu cũ"><Button type="button" variant="outline" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Trang trước</Button><span>Trang {page}/{data.totalPages}</span><Button type="button" variant="outline" disabled={loading || page >= data.totalPages} onClick={() => setPage(page + 1)}>Trang sau</Button></nav> : null}
    <Modal open={!!selected} onOpenChange={open => { if (!open && !busy) setSelected(null); }} title="Xác nhận đối soát doanh thu cũ" description="Chỉ xác nhận khi đã kiểm tra đủ chứng từ chi trả.">
      <form className="withdrawals withdrawal-form" onSubmit={event => void approve(event)}><fieldset disabled={busy}>
        <p>Doanh thu đã ghi nhận ban đầu: {formatGdsVnd(selected?.recognizedMinor)}</p><p>Doanh thu ròng sau hoàn tiền: {formatGdsVnd(selected?.netMinor)}</p><label>Số tiền đã chi ngoài hệ thống (VND)<input required inputMode="numeric" maxLength={19} value={paid} onChange={e => setPaid(e.target.value)} /></label><p>Nhập 0 khi xác nhận chưa từng chi khoản này. Số tiền đã chi không vượt doanh thu đã ghi nhận ban đầu.</p><p>Nếu số tiền đã chi lớn hơn doanh thu ròng sau hoàn tiền, phần chênh lệch được ghi công nợ để bù từ doanh thu tiếp theo.</p>
        <label>Căn cứ / ghi chú đối soát<textarea required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>{error ? <p role="alert">{error}</p> : null}
        <Button type="submit" disabled={busy || !validPaid || !reason.trim()}>Xác nhận đã đối soát</Button>
      </fieldset></form>
    </Modal>
  </section>;
}
