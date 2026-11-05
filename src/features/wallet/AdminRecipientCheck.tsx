import { useState, type FormEvent } from 'react';
import { CheckCheck, Info } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { gdsWithdrawalService, withdrawalError, type Withdrawal } from '../../services/gds-withdrawal.service';

const normalizeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'D').toUpperCase().replace(/\s+/g, ' ').trim();
export function AdminRecipientCheck({ item, disabled, onChanged, onBusyChange }: { item: Withdrawal; disabled: boolean; onChanged: (item: Withdrawal) => void; onBusyChange?: (busy: boolean) => void }) {
  const [holder, setHolder] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const matches = normalizeName(holder) === normalizeName(item.accountHolder);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || busy || !confirmed || !matches || !reason.trim()) return;
    setBusy(true); onBusyChange?.(true); setError('');
    try { onChanged(await gdsWithdrawalService.confirmRecipient(item.id, { confirmed: true, accountHolder: holder.trim(), reason: reason.trim() })); }
    catch (cause) { setError(withdrawalError(cause)); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <form className="withdrawal-form admin-recipient-check" onSubmit={event => void submit(event)}>
    <div className="admin-withdrawal-step-heading"><span>01</span><div><h3>Đối chiếu người nhận</h3><p>Mở ứng dụng ngân hàng, chọn ngân hàng và nhập số tài khoản ở trên để kiểm tra tên người nhận.</p></div></div>
    <p className="admin-withdrawal-help"><Info size={17} aria-hidden="true" />Đây là xác nhận thủ công của admin, không phải kết quả tra cứu API.</p>
    <fieldset disabled={busy || disabled}>
      <label>Tên người nhận trên ứng dụng ngân hàng<input required autoComplete="off" maxLength={160} value={holder} onChange={e => { setHolder(e.target.value); setConfirmed(false); }} placeholder="Nhập đúng tên ngân hàng hiển thị" /></label>
      {holder.trim() && !matches ? <p role="alert">Tên không khớp yêu cầu. Không chuyển tiền; hãy kiểm tra lại hoặc từ chối và ghi rõ lý do.</p> : null}
      {holder.trim() && matches ? <p className="admin-withdrawal-match"><CheckCheck size={16} aria-hidden="true" />Tên khớp với yêu cầu sau khi bỏ dấu và chuẩn hóa khoảng trắng.</p> : null}
      <label className="withdrawal-check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Tôi đã đối chiếu đúng ngân hàng, số tài khoản và tên người nhận</label>
      <label>Ghi chú đối chiếu<textarea required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Ghi lại căn cứ kiểm tra trên ngân hàng" /></label>
      {error ? <p role="alert">{error}</p> : null}
      <Button type="submit" disabled={busy || disabled || !confirmed || !matches || !reason.trim()}>{busy ? 'Đang lưu đối chiếu…' : item.status === 'PENDING' ? 'Xác nhận đúng & duyệt' : 'Lưu đối chiếu người nhận'}</Button>
    </fieldset>
  </form>;
}
