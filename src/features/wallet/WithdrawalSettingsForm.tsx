import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { gdsWithdrawalService, withdrawalError, type WithdrawalSettings } from '../../services/gds-withdrawal.service';

export function WithdrawalSettingsForm({ settings, onSaved }: { settings: WithdrawalSettings; onSaved: (settings: WithdrawalSettings) => void }) {
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setDraft(settings); }, [settings]);
  const valid = /^[1-9]\d{0,18}$/.test(draft.minimumMinor) && /^[1-9]\d{0,18}$/.test(draft.maximumMinor) && BigInt(draft.minimumMinor) <= BigInt(draft.maximumMinor);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!valid || busy) return;
    setBusy(true); setMessage('');
    try { const saved = await gdsWithdrawalService.updateSettings(draft); setDraft(saved); onSaved(saved); setMessage('Đã lưu cấu hình hạn mức.'); }
    catch (cause) { setMessage(withdrawalError(cause)); }
    finally { setBusy(false); }
  }
  return <section className="withdrawal-panel"><h2>Hạn mức rút tiền</h2><p>Áp dụng chung cho học viên và giảng viên. Thay đổi chỉ áp dụng cho yêu cầu mới.</p>
    <form className="withdrawal-form" onSubmit={event => void save(event)}><fieldset disabled={busy}>
      <div className="withdrawal-settings-grid"><label>Tối thiểu mỗi yêu cầu (VND)<input required inputMode="numeric" value={draft.minimumMinor} onChange={e => setDraft({ ...draft, minimumMinor: e.target.value })} /></label>
        <label>Tối đa mỗi yêu cầu (VND)<input required inputMode="numeric" value={draft.maximumMinor} onChange={e => setDraft({ ...draft, maximumMinor: e.target.value })} /></label></div>
      <label className="withdrawal-check"><input type="checkbox" checked={draft.admissionEnabled} onChange={e => setDraft({ ...draft, admissionEnabled: e.target.checked })} />Nhận yêu cầu mới</label>
      <label className="withdrawal-check"><input type="checkbox" checked={draft.processingEnabled} onChange={e => setDraft({ ...draft, processingEnabled: e.target.checked })} />Xử lý yêu cầu tồn đọng</label>
      <p>Tắt nhận yêu cầu mới không làm mất yêu cầu đã gửi. Miễn phí rút tiền.</p>
      {!valid ? <p role="alert">Hạn mức phải là số nguyên dương và tối thiểu không lớn hơn tối đa.</p> : null}
      {message ? <p role="status">{message}</p> : null}<Button type="submit" disabled={busy || !valid}>{busy ? 'Đang lưu…' : 'Lưu cấu hình hạn mức'}</Button>
    </fieldset></form>
  </section>;
}
