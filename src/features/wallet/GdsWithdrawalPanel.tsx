import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { formatGdsVnd, type GdsWalletSummary } from '../../services/gds-wallet.service';
import { canSubmitWithdrawal, gdsWithdrawalService, withdrawalError, type Withdrawal, type WithdrawalInput, type WithdrawalPage, type WithdrawalSettings } from '../../services/gds-withdrawal.service';
import { WithdrawalInformation, WithdrawalRecords } from './WithdrawalRecords';
import './Withdrawals.css';

const emptyInput: WithdrawalInput = { amountMinor: '', bankCode: '', accountNumber: '', accountHolder: '' };
export function GdsWithdrawalPanel({ summary, onChanged }: { summary: GdsWalletSummary; onChanged: () => void }) {
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);
  const [records, setRecords] = useState<WithdrawalPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(false);
  const [input, setInput] = useState(emptyInput);
  const [detail, setDetail] = useState<Withdrawal | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const listGeneration = useRef(0);
  const detailGeneration = useRef(0);
  const load = useCallback(async () => {
    const generation = ++listGeneration.current;
    setLoading(true); setError('');
    try {
      const [policy, history] = await Promise.all([gdsWithdrawalService.settings(), gdsWithdrawalService.list(page)]);
      if (generation === listGeneration.current) { setSettings(policy); setRecords(history); }
    } catch (cause) { if (generation === listGeneration.current) setError(withdrawalError(cause)); }
    finally { if (generation === listGeneration.current) setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); return () => { listGeneration.current++; detailGeneration.current++; }; }, [load]);
  const valid = summary.withdrawalEnabled === true && canSubmitWithdrawal(input.amountMinor, summary.balance?.availableMinor ?? '', summary.debtMinor ?? '0', settings) &&
    /^[A-Za-z0-9_-]{2,32}$/.test(input.bankCode) && /^[0-9]{6,34}$/.test(input.accountNumber) && input.accountHolder.trim().length >= 2 && input.accountHolder.trim().length <= 160 && !/[\u0000-\u001f\u007f]/.test(input.accountHolder);
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    if (!review) { setReview(true); return; }
    const fingerprint = JSON.stringify(input);
    if (!request.current || request.current.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true); setError('');
    try {
      const created = await gdsWithdrawalService.create(input, request.current.key);
      setOpen(false); setReview(false); setInput(emptyInput); request.current = null;
      setDetail(created); setNotice('Đã gửi yêu cầu. Số tiền được giữ và chờ admin duyệt.');
      onChanged(); await load();
    } catch (cause) { setError(withdrawalError(cause)); }
    finally { setBusy(false); }
  }
  async function select(id: string) {
    const generation = ++detailGeneration.current; setError(''); setBusy(true);
    try { const item = await gdsWithdrawalService.detail(id); if (generation === detailGeneration.current) { setDetail(item); setCancelReason(''); } }
    catch (cause) { if (generation === detailGeneration.current) setError(withdrawalError(cause)); }
    finally { if (generation === detailGeneration.current) setBusy(false); }
  }
  async function cancel(event: FormEvent) {
    event.preventDefault(); if (!detail || busy || !cancelReason.trim()) return;
    setBusy(true); setError('');
    try { setDetail(await gdsWithdrawalService.cancel(detail.id, cancelReason.trim())); onChanged(); await load(); }
    catch (cause) { setError(withdrawalError(cause)); }
    finally { setBusy(false); }
  }
  return <section className="withdrawals withdrawal-panel" aria-labelledby="gds-withdrawal-title">
    <div className="withdrawal-heading"><div><h2 id="gds-withdrawal-title">Rút tiền GDS</h2><p>Chuyển về tài khoản ngân hàng của bạn. Miễn phí rút tiền.</p></div>
      <Button type="button" disabled={loading || busy || summary.withdrawalEnabled !== true || !settings?.admissionEnabled} onClick={() => { setOpen(true); setReview(!!request.current); setError(''); }}>Rút tiền</Button></div>
    <dl className="withdrawal-balances"><div><dt>Đang giữ</dt><dd>{formatGdsVnd(summary.balance?.reservedMinor)}</dd></div><div><dt>Công nợ</dt><dd>{formatGdsVnd(summary.debtMinor ?? '0')}</dd></div></dl>
    {settings ? <p>Mỗi yêu cầu: {formatGdsVnd(settings.minimumMinor)} – {formatGdsVnd(settings.maximumMinor)}, không vượt số dư khả dụng.</p> : null}
    {!loading && settings && !settings.admissionEnabled ? <p role="status">Đang tạm ngừng nhận yêu cầu mới. Yêu cầu đã gửi vẫn được theo dõi bên dưới.</p> : null}
    {summary.debtMinor && summary.debtMinor !== '0' ? <p className="withdrawal-notice">Bạn còn công nợ nên chưa thể rút tiền. Doanh thu tiếp theo sẽ bù công nợ trước khi cộng vào GDS.</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {error && !open && !detail ? <p role="alert">{error}</p> : null}
    <div className="withdrawal-heading"><h3>Lịch sử rút tiền</h3><Button type="button" variant="outline" disabled={loading || busy} onClick={() => { onChanged(); void load(); }}>Tải lại yêu cầu</Button></div>
    <WithdrawalRecords data={records} loading={loading} page={page} onPage={setPage} onSelect={id => void select(id)} />
    <Modal open={open} onOpenChange={value => { if (!busy) setOpen(value); }} title={review ? 'Xác nhận yêu cầu rút tiền' : 'Rút tiền về ngân hàng'} description="Kiểm tra kỹ tài khoản nhận. Thông tin không thể sửa sau khi gửi.">
      <form className="withdrawals withdrawal-form" onSubmit={event => void create(event)}><fieldset disabled={busy}>
        {(['amountMinor', 'bankCode', 'accountNumber', 'accountHolder'] as const).map(field => <label key={field}>
          {{ amountMinor: 'Số tiền rút (VND)', bankCode: 'Mã ngân hàng', accountNumber: 'Số tài khoản', accountHolder: 'Tên chủ tài khoản' }[field]}
          <input required autoComplete="off" inputMode={field === 'amountMinor' || field === 'accountNumber' ? 'numeric' : 'text'} maxLength={field === 'accountHolder' ? 160 : field === 'bankCode' ? 32 : 34} readOnly={review} value={input[field]} onChange={e => setInput(current => ({ ...current, [field]: e.target.value }))} />
        </label>)}
        {review ? <p>Giữ {formatGdsVnd(input.amountMinor)} từ số dư khả dụng ngay khi gửi. Admin sẽ kiểm tra và chuyển khoản thủ công.</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <div className="withdrawal-actions">{review ? <Button type="button" variant="outline" disabled={busy || !!request.current} onClick={() => setReview(false)}>Sửa thông tin</Button> : null}<Button type="submit" disabled={!valid || busy}>{busy ? 'Đang gửi…' : review ? 'Xác nhận gửi yêu cầu' : 'Kiểm tra yêu cầu'}</Button></div>
      </fieldset></form>
    </Modal>
    <Modal open={!!detail} onOpenChange={value => { if (!value && !busy) { setDetail(null); detailGeneration.current++; } }} title="Chi tiết rút tiền" description="Trạng thái và lịch sử xử lý từ hệ thống.">
      {detail ? <div className="withdrawals"><WithdrawalInformation item={detail} />{error ? <p role="alert">{error}</p> : null}
        {detail.status === 'PENDING' ? <form className="withdrawal-form" onSubmit={event => void cancel(event)}><label>Lý do hủy<textarea required maxLength={500} value={cancelReason} onChange={e => setCancelReason(e.target.value)} /></label><Button type="submit" variant="outline" disabled={busy || !cancelReason.trim()}>Hủy yêu cầu rút tiền</Button></form> : null}</div> : null}
    </Modal>
  </section>;
}
