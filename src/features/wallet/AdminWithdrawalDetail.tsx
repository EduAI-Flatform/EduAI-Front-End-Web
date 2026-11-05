import { useEffect, useState, type FormEvent } from 'react';
import { Check, Landmark } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { gdsWithdrawalService, withdrawalActions, withdrawalActionLabels, withdrawalError, type Withdrawal, type WithdrawalAction } from '../../services/gds-withdrawal.service';
import { WithdrawalInformation, WithdrawalSummary } from './WithdrawalRecords';
import { AdminWithdrawalBank } from './AdminWithdrawalBank';
import { AdminRecipientCheck } from './AdminRecipientCheck';
import './AdminWithdrawalDetail.css';

function localTimestamp(value: number): string | undefined {
  const date = new Date(value);
  return Number.isFinite(value) ? new Date(value - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 19) : undefined;
}

export function AdminWithdrawalDetail({ item, processingEnabled, verificationRequired = false, verificationAvailable = false, actorId, onClose, onChanged }: { item: Withdrawal; processingEnabled: boolean; verificationRequired?: boolean; verificationAvailable?: boolean; actorId?: string; onClose: () => void; onChanged: (value: Withdrawal) => void }) {
  const [action, setAction] = useState<WithdrawalAction | ''>('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [transferredAt, setTransferredAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const automaticRequired = verificationRequired || !!item.accountVerifiedAt;
  const check = item.recipientCheck;
  const checkedByMe = !!check && check.actorId === actorId && Date.parse(check.expiresAt) > now && (!automaticRequired || check.method === 'PROVIDER');
  const hasFreshCheck = checkedByMe;
  const terminal = !['PENDING', 'APPROVED', 'PROCESSING'].includes(item.status);
  const confirmationNeeded = !terminal && (item.status !== 'PROCESSING' || !hasFreshCheck);
  const step = terminal ? 3 : item.status === 'PENDING' ? 1 : 2;
  // The server also enforces ownership, operator claim and authorization.
  const claimedByAnother = item.status === 'PROCESSING' && !!item.processingAdminId && item.processingAdminId !== actorId;
  const ownRequest = item.ownerId === actorId;
  const blocked = (value: WithdrawalAction) => busy || checking || !actorId || claimedByAnother || ownRequest ||
    (!processingEnabled && ['process', 'pay', 'fail'].includes(value));
  const transferTime = new Date(transferredAt).getTime();
  const createdTime = Date.parse(item.createdAt);
  const validTransferTime = Number.isFinite(transferTime) && Number.isFinite(createdTime) && transferTime >= createdTime && transferTime <= Date.now();
  const missingPayEvidence = action === 'pay' && (!reference.trim() || !validTransferTime);
  const missingReason = action !== 'pay' && !reason.trim();
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!action || blocked(action) || missingReason || missingPayEvidence) return;
    setBusy(true); setError('');
    try {
      const next = await gdsWithdrawalService.action(item.id, action, { ...(reason.trim() ? { reason: reason.trim() } : {}), ...(action === 'pay' ? { bankTransactionRef: reference.trim(), transferredAt: new Date(transferredAt).toISOString() } : {}) });
      onChanged(next); setAction(''); setReason(''); setReference(''); setTransferredAt('');
    } catch (cause) { setError(withdrawalError(cause)); }
    finally { setBusy(false); }
  }
  return <Modal open className="admin-withdrawal-detail-modal" onOpenChange={open => { if (!open && !busy && !checking) onClose(); }} title={<span className="admin-withdrawal-dialog-title"><Landmark size={22} aria-hidden="true" />Xử lý yêu cầu rút tiền</span>} description="Kiểm tra người nhận và cập nhật kết quả chuyển khoản.">
    <div className="withdrawals admin-withdrawal-detail"><WithdrawalSummary item={item} />
      {!terminal ? <ol className="admin-withdrawal-steps" aria-label="Quy trình xử lý rút tiền">{['Chờ duyệt', 'Chờ chuyển khoản', 'Đã chuyển khoản'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step > index + 1 ? 'is-complete' : ''}><span>{step > index + 1 ? <Check size={13} aria-hidden="true" /> : index + 1}</span><span className="admin-withdrawal-step-label">{label}</span></li>)}</ol> : null}
      <AdminWithdrawalBank item={item} actorId={actorId} verificationAvailable={verificationAvailable} showVerificationAction={false} />
      {!processingEnabled ? <p role="status">Chuyển khoản đang tạm ngừng. Admin vẫn có thể từ chối yêu cầu chưa chuyển tiền.</p> : null}
      {claimedByAnother ? <p role="status">Yêu cầu đang do admin khác chuyển khoản.</p> : null}
      {ownRequest ? <p role="status">Bạn không được xử lý yêu cầu rút tiền của chính mình.</p> : null}
      {!terminal && !verificationAvailable && automaticRequired ? <p className="admin-withdrawal-help" role="status">Yêu cầu này bắt buộc tra cứu tự động, nhưng dịch vụ chưa sẵn sàng. Chưa thể duyệt chuyển khoản; vẫn có thể đối soát khoản đã chuyển.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!action && confirmationNeeded && !ownRequest && !claimedByAnother ? <AdminRecipientCheck key={item.id + (check?.verifiedAt ?? '')} item={item} disabled={busy || !actorId || !processingEnabled || automaticRequired && !verificationAvailable} onBusyChange={setChecking} onChanged={onChanged} /> : null}
      {!terminal && !action ? <div className="admin-withdrawal-next"><h3>{item.status === 'PENDING' ? 'Thông tin chưa đúng?' : 'Sau khi chuyển tiền trên ngân hàng'}</h3><p>{item.status === 'PENDING' ? 'Từ chối và ghi lý do để hoàn tiền đang giữ về ví.' : 'Chuyển tiền xong, chọn Đã chuyển khoản và lưu thông tin giao dịch. Nếu kết quả ngân hàng chưa rõ, giữ nguyên yêu cầu để đối soát.'}</p><div className="withdrawal-actions">{withdrawalActions(item.status).filter(value => !['approve', 'process'].includes(value)).map(value => <Button key={value} type="button" variant={value === 'pay' ? 'default' : 'outline'} className={['reject', 'fail'].includes(value) ? 'admin-withdrawal-danger' : undefined} disabled={blocked(value)} onClick={() => setAction(value)}>{withdrawalActionLabels[value]}</Button>)}</div></div> : action ?
        <form className="withdrawal-form admin-withdrawal-action-form" onSubmit={event => void submit(event)}><fieldset disabled={busy}>
          <h3>{withdrawalActionLabels[action]}</h3>
          {action === 'fail' ? <p className="withdrawal-notice">Chỉ xác nhận khi đã kiểm tra chắc chắn chưa chi hoặc ngân hàng báo thất bại. Kết quả chưa rõ phải giữ nguyên trạng thái đang chuyển khoản.</p> : null}
          {action === 'pay' ? <><label>Mã giao dịch ngân hàng<input required maxLength={160} value={reference} onChange={e => setReference(e.target.value)} /></label><label>Thời điểm chuyển khoản<input required type="datetime-local" step="1" min={localTimestamp(Math.ceil(createdTime / 1000) * 1000)} max={localTimestamp(Date.now())} value={transferredAt} onChange={e => setTransferredAt(e.target.value)} /></label>{transferredAt && !validTransferTime ? <p role="alert">Thời điểm chuyển khoản phải từ lúc tạo yêu cầu đến hiện tại.</p> : null}</> : null}
          <label>{action === 'pay' ? 'Ghi chú chuyển khoản (không bắt buộc)' : 'Lý do xử lý'}<textarea required={action !== 'pay'} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
          <div className="withdrawal-actions"><Button type="button" variant="outline" onClick={() => setAction('')}>Quay lại</Button><Button type="submit" disabled={blocked(action) || missingReason || missingPayEvidence}>{busy ? 'Đang xử lý…' : 'Xác nhận thao tác'}</Button></div>
        </fieldset></form> : null}
      <details className="admin-withdrawal-audit" open={terminal}><summary>Thông tin yêu cầu & lịch sử xử lý</summary><WithdrawalInformation item={item} hideRecipient hideSummary /></details>
    </div>
  </Modal>;
}
