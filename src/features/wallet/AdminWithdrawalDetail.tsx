import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { gdsWithdrawalService, withdrawalActions, withdrawalActionLabels, withdrawalError, type Withdrawal, type WithdrawalAction } from '../../services/gds-withdrawal.service';
import { WithdrawalInformation } from './WithdrawalRecords';
import { AdminWithdrawalBank } from './AdminWithdrawalBank';

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
  const [error, setError] = useState('');
  // The server also enforces ownership, operator claim and authorization.
  const claimedByAnother = item.status === 'PROCESSING' && !!item.processingAdminId && item.processingAdminId !== actorId;
  const ownRequest = item.ownerId === actorId;
  const blocked = (value: WithdrawalAction) => busy || claimedByAnother || ownRequest ||
    (value === 'process' && verificationRequired && !verificationAvailable) ||
    (!processingEnabled && ['process', 'pay', 'fail'].includes(value));
  const transferTime = new Date(transferredAt).getTime();
  const createdTime = Date.parse(item.createdAt);
  const validTransferTime = Number.isFinite(transferTime) && Number.isFinite(createdTime) && transferTime >= createdTime && transferTime <= Date.now();
  const missingPayEvidence = action === 'pay' && (!reference.trim() || !validTransferTime);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!action || blocked(action) || !reason.trim() || missingPayEvidence) return;
    setBusy(true); setError('');
    try {
      const next = await gdsWithdrawalService.action(item.id, action, { reason: reason.trim(), ...(action === 'pay' ? { bankTransactionRef: reference.trim(), transferredAt: new Date(transferredAt).toISOString() } : {}) });
      onChanged(next); setAction(''); setReason(''); setReference(''); setTransferredAt('');
    } catch (cause) { setError(withdrawalError(cause)); }
    finally { setBusy(false); }
  }
  return <Modal open className="max-w-3xl" onOpenChange={open => { if (!open && !busy) onClose(); }} title="Xử lý yêu cầu rút tiền" description="Kiểm tra người nhận và lịch sử trước khi thực hiện thao tác.">
    <div className="withdrawals"><AdminWithdrawalBank item={item} actorId={actorId} /><WithdrawalInformation item={item} hideRecipient />
      {!processingEnabled ? <p role="status">Chuyển khoản đang tạm ngừng. Admin vẫn có thể duyệt hoặc từ chối yêu cầu chưa chuyển tiền.</p> : null}
      {claimedByAnother ? <p role="status">Yêu cầu đang do admin khác chuyển khoản.</p> : null}
      {ownRequest ? <p role="status">Bạn không được xử lý yêu cầu rút tiền của chính mình.</p> : null}
      {verificationRequired && !verificationAvailable ? <p role="status">Dịch vụ xác minh đang tạm thời chưa sẵn sàng. Chưa thể bắt đầu chuyển khoản mới; tiếp tục đối soát yêu cầu đã chuyển theo quy trình hiện tại.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!action ? <div className="withdrawal-actions">{withdrawalActions(item.status).map(value => <Button key={value} type="button" variant="outline" disabled={blocked(value)} onClick={() => setAction(value)}>{withdrawalActionLabels[value]}</Button>)}</div> :
        <form className="withdrawal-form" onSubmit={event => void submit(event)}><fieldset disabled={busy}>
          <h3>{withdrawalActionLabels[action]}</h3>
          {action === 'process' ? <p>Nhận xử lý độc quyền trước khi chuyển khoản. Chỉ chuyển đúng số tiền và tài khoản trên yêu cầu.</p> : null}
          {action === 'fail' ? <p className="withdrawal-notice">Chỉ xác nhận khi đã kiểm tra chắc chắn chưa chi hoặc ngân hàng báo thất bại. Kết quả chưa rõ phải giữ nguyên trạng thái đang chuyển khoản.</p> : null}
          {action === 'pay' ? <><label>Mã giao dịch ngân hàng<input required maxLength={160} value={reference} onChange={e => setReference(e.target.value)} /></label><label>Thời điểm chuyển khoản<input required type="datetime-local" step="1" min={localTimestamp(Math.ceil(createdTime / 1000) * 1000)} max={localTimestamp(Date.now())} value={transferredAt} onChange={e => setTransferredAt(e.target.value)} /></label>{transferredAt && !validTransferTime ? <p role="alert">Thời điểm chuyển khoản phải từ lúc tạo yêu cầu đến hiện tại.</p> : null}</> : null}
          <label>Lý do / ghi chú đối soát<textarea required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
          <div className="withdrawal-actions"><Button type="button" variant="outline" onClick={() => setAction('')}>Quay lại</Button><Button type="submit" disabled={blocked(action) || !reason.trim() || missingPayEvidence}>{busy ? 'Đang xử lý…' : 'Xác nhận thao tác'}</Button></div>
        </fieldset></form>}
    </div>
  </Modal>;
}
