import { SystemText } from '@/features/platform/SystemText';
import { useRef, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { gdsWithdrawalService, withdrawalError, type Withdrawal } from '../../services/gds-withdrawal.service';

export function AdminRecipientCheck({ item, disabled, onChanged, onBusyChange }: { item: Withdrawal; disabled: boolean; onChanged: (item: Withdrawal) => void; onBusyChange?: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  async function confirm() {
    if (disabled || submitting.current) return;
    submitting.current = true; setBusy(true); onBusyChange?.(true); setError('');
    try { onChanged(await gdsWithdrawalService.confirmRecipient(item.id, { confirmed: true })); }
    catch (cause) { setError(withdrawalError(cause)); }
    finally { submitting.current = false; setBusy(false); onBusyChange?.(false); }
  }
  return <section className="admin-recipient-check">
    <div className="admin-withdrawal-step-heading"><CheckCheck size={22} aria-hidden="true" /><div><h3><SystemText message={"Đối chiếu người nhận"} /></h3><p><SystemText message={"Kiểm tra ngân hàng, số tài khoản và tên người nhận trên ứng dụng ngân hàng. Nếu đúng, duyệt để mở QR chuyển khoản."} /></p></div></div>
    {error ? <p role="alert"><SystemText message={error} /></p> : null}
    <Button type="button" disabled={disabled || busy} onClick={() => void confirm()}>{busy ? <SystemText message={"Đang xác nhận…"} /> : item.status === 'PENDING' ? <SystemText message={"Xác nhận đúng & duyệt"} /> : item.status === 'APPROVED' ? <SystemText message={"Xác nhận đúng & mở QR"} /> : <SystemText message={"Xác nhận lại người nhận"} />}</Button>
  </section>;
}
