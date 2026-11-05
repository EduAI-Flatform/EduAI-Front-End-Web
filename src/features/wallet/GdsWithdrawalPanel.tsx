import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { ApiClientError } from '../../services/api-client';
import { formatGdsVnd, hasTrustedGdsBalance, type GdsWalletSummary } from '../../services/gds-wallet.service';
import { canSubmitWithdrawal, gdsWithdrawalService, withdrawalError, withdrawalDate, type GdsBanks, type Withdrawal, type WithdrawalInput, type WithdrawalPage, type WithdrawalSettings } from '../../services/gds-withdrawal.service';
import { WithdrawalInformation } from './WithdrawalRecords';
import { GdsTransactionHistory } from './GdsTransactionHistory';
import { BankPicker } from './BankPicker';
import { useAccountVerification } from './useAccountVerification';
import './Withdrawals.css';
import './GdsWithdrawalAction.css';

const emptyInput: WithdrawalInput = { amountMinor: '', bankCode: '', accountNumber: '', accountHolder: '' };
export function GdsWithdrawalPanel({ summary, onChanged }: { summary: GdsWalletSummary; onChanged: () => void }) {
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);
  const [records, setRecords] = useState<WithdrawalPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(false);
  const [input, setInput] = useState(emptyInput);
  const [detail, setDetail] = useState<Withdrawal | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const request = useRef<{ key: string; payload: WithdrawalInput } | null>(null);
  const [banks, setBanks] = useState<GdsBanks | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState(false);
  const bankGeneration = useRef(0);
  const loadBanks = useCallback(async () => {
    const generation = ++bankGeneration.current;
    setBankLoading(true); setBankError(false);
    try { const result = await gdsWithdrawalService.banks(); if (!Array.isArray(result.banks)) throw new Error('BANK_CATALOGUE_UNAVAILABLE'); if (generation === bankGeneration.current) setBanks(result); }
    catch { if (generation === bankGeneration.current) setBankError(true); }
    finally { if (generation === bankGeneration.current) setBankLoading(false); }
  }, []);
  useEffect(() => { if (open) void loadBanks(); return () => { bankGeneration.current++; }; }, [open, loadBanks]);
  const verificationRequired = settings?.accountVerificationRequired === true || banks?.verificationRequired === true;
  const verificationAvailable = settings?.accountVerificationAvailable !== false && banks?.verificationAvailable === true;
  const selectedBank = banks?.banks.find(bank => bank.code === input.bankCode);
  const verification = useAccountVerification(input.bankCode, input.accountNumber, open && verificationRequired && !!selectedBank?.verificationSupported && verificationAvailable && !request.current);
  const effectiveInput: WithdrawalInput = request.current?.payload ?? (verificationRequired ? { ...input, accountHolder: verification.result?.accountHolder ?? '', ...(verification.result ? { verificationId: verification.result.verificationId } : {}) } : input);
  const listGeneration = useRef(0);
  const detailGeneration = useRef(0);
  const load = useCallback(async () => {
    const generation = ++listGeneration.current;
    setLoading(true); setHistoryError('');
    try {
      const [policy, history] = await Promise.all([gdsWithdrawalService.settings(), gdsWithdrawalService.list(page)]);
      if (generation === listGeneration.current) { setSettings(policy); setRecords(history); }
    } catch { if (generation === listGeneration.current) setHistoryError('Chưa tải được yêu cầu rút tiền. Các giao dịch GDS khác vẫn có thể xem bên dưới.'); }
    finally { if (generation === listGeneration.current) setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); return () => { listGeneration.current++; detailGeneration.current++; }; }, [load]);
  const valid = !!request.current || summary.withdrawalEnabled === true && canSubmitWithdrawal(input.amountMinor, summary.balance?.availableMinor ?? '', summary.debtMinor ?? '0', settings) &&
    !!selectedBank && !bankLoading && !bankError && (verificationRequired ? /^[0-9]{6,19}$/ : /^[0-9]{6,34}$/).test(input.accountNumber) && effectiveInput.accountHolder.trim().length >= 2 && effectiveInput.accountHolder.trim().length <= 160 && !/[\u0000-\u001f\u007f]/.test(effectiveInput.accountHolder) && (!verificationRequired || !!verification.result || !!request.current);
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    if (!review) { setReview(true); return; }
    if (!request.current) request.current = { key: crypto.randomUUID(), payload: effectiveInput };
    setBusy(true); setError('');
    try {
      const created = await gdsWithdrawalService.create(request.current.payload, request.current.key);
      setOpen(false); setReview(false); setInput(emptyInput); request.current = null;
      setDetail(created); setNotice('Đã gửi yêu cầu. Số tiền được giữ và chờ admin duyệt.');
      onChanged(); await load();
    } catch (cause) {
      // A definite rejection did not create a hold; allow correcting or refreshing proof.
      // Network/5xx outcomes keep the exact payload/key until the result is known.
      if (cause instanceof ApiClientError && [400, 401, 403, 404, 409, 410, 422].includes(cause.status)) { request.current = null; setReview(false); }
      setError(withdrawalError(cause));
    }
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
  const transactions = hasTrustedGdsBalance(summary) && Array.isArray(summary.recentTransactions) ? summary.recentTransactions : undefined;
  return <div className="withdrawals gds-withdrawal-feature">
    <section className="gds-withdrawal-action" aria-labelledby="gds-withdrawal-title"><div className="gds-withdrawal-action-copy"><h2 id="gds-withdrawal-title">Rút tiền về ngân hàng</h2><p>Miễn phí{settings ? ` · ${formatGdsVnd(settings.minimumMinor)} – ${formatGdsVnd(settings.maximumMinor)} mỗi lần` : ''}</p><p className="gds-withdrawal-action-balances">Đang giữ: {formatGdsVnd(summary.balance?.reservedMinor)} · Công nợ: {formatGdsVnd(summary.debtMinor ?? '0')}</p></div>
      <Button type="button" disabled={loading || busy || summary.withdrawalEnabled !== true || !settings?.admissionEnabled} onClick={() => { setOpen(true); setReview(!!request.current); setError(''); }}>Rút tiền</Button>
    {!loading && settings && !settings.admissionEnabled ? <p role="status">Đang tạm ngừng nhận yêu cầu mới. Yêu cầu đã gửi vẫn được theo dõi bên dưới.</p> : null}
    {summary.debtMinor && summary.debtMinor !== '0' ? <p className="withdrawal-notice">Bạn còn công nợ nên chưa thể rút tiền. Doanh thu tiếp theo sẽ bù công nợ trước khi cộng vào GDS.</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {error && !open && !detail ? <p role="alert">{error}</p> : null}
    </section>
    <GdsTransactionHistory transactions={transactions} withdrawals={records} loading={loading} error={historyError} page={page} onPage={setPage} busy={busy} onSelect={id => void select(id)} onRefresh={() => { onChanged(); void load(); }} />
    <Modal open={open} onOpenChange={value => { if (!busy) setOpen(value); }} title={review ? 'Xác nhận yêu cầu rút tiền' : 'Rút tiền về ngân hàng'} description="Kiểm tra kỹ tài khoản nhận. Thông tin không thể sửa sau khi gửi.">
      <form className="withdrawals withdrawal-form" onSubmit={event => void create(event)}><fieldset disabled={busy}>
        <label>Số tiền rút (VND)<input required autoComplete="off" inputMode="numeric" maxLength={19} readOnly={review} value={input.amountMinor} onChange={event => setInput(current => ({ ...current, amountMinor: event.target.value }))} /></label>
        <p>Số dư khả dụng: {formatGdsVnd(summary.balance?.availableMinor)}. {settings ? `Hạn mức: ${formatGdsVnd(settings.minimumMinor)} – ${formatGdsVnd(settings.maximumMinor)}.` : ''}</p>
        {bankLoading ? <p role="status">Đang tải danh sách ngân hàng…</p> : bankError ? <div role="alert"><p>Không thể tải danh sách ngân hàng.</p><Button type="button" variant="outline" onClick={() => void loadBanks()}>Thử tải ngân hàng lại</Button></div> : null}
        <BankPicker banks={banks?.banks ?? []} value={input.bankCode} disabled={review || busy || bankLoading || bankError} verificationRequired={verificationRequired} onChange={bankCode => setInput(current => ({ ...current, bankCode, accountHolder: '' }))} />
        <label>Số tài khoản<input required autoComplete="off" inputMode="numeric" maxLength={verificationRequired ? 19 : 34} readOnly={review} value={input.accountNumber} aria-describedby={verificationRequired ? 'gds-account-verification' : undefined} aria-invalid={verificationRequired && verification.state === 'invalid'} onChange={event => setInput(current => ({ ...current, accountNumber: event.target.value, accountHolder: verificationRequired ? '' : current.accountHolder }))} /></label>
        {verificationRequired ? <div id="gds-account-verification" aria-live="polite">
          {verification.result ? <p>✓ Đã xác minh người nhận · {withdrawalDate(verification.result.verifiedAt)}</p> : banks && !verificationAvailable ? <p>Dịch vụ xác minh đang tạm thời chưa sẵn sàng. Vui lòng thử lại sau.</p> : verification.state === 'loading' ? <p role="status">Đang kiểm tra tài khoản…</p> : verification.state === 'invalid' ? <p role="alert">Tài khoản không hợp lệ. Kiểm tra lại ngân hàng và số tài khoản.</p> : ['error', 'expired'].includes(verification.state) ? <><p role="alert">{verification.state === 'expired' ? 'Kết quả xác minh đã hết hạn.' : 'Chưa thể xác minh tài khoản. Vui lòng thử lại.'}</p><Button type="button" variant="outline" onClick={verification.retry} disabled={busy}>Thử xác minh lại</Button></> : <p>Chọn ngân hàng và nhập số tài khoản từ 6–19 chữ số để xác minh người nhận.</p>}
        </div> : <p>Tên người nhận hiện do bạn cung cấp. Admin kiểm tra trước khi chuyển khoản.</p>}
        <label>Tên chủ tài khoản<input required autoComplete="off" maxLength={160} readOnly={review || verificationRequired} value={effectiveInput.accountHolder} onChange={event => setInput(current => ({ ...current, accountHolder: event.target.value }))} /></label>
        {review ? <p>Phí rút tiền: 0đ. Ngân hàng: {selectedBank?.name}.</p> : null}
        {review ? <p>Giữ {formatGdsVnd(input.amountMinor)} từ số dư khả dụng ngay khi gửi. Admin sẽ kiểm tra và chuyển khoản thủ công.</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <div className="withdrawal-actions">{review ? <Button type="button" variant="outline" disabled={busy || !!request.current} onClick={() => setReview(false)}>Sửa thông tin</Button> : null}<Button type="submit" disabled={!valid || busy}>{busy ? 'Đang gửi…' : review ? 'Xác nhận gửi yêu cầu' : 'Kiểm tra yêu cầu'}</Button></div>
      </fieldset></form>
    </Modal>
    <Modal open={!!detail} onOpenChange={value => { if (!value && !busy) { setDetail(null); detailGeneration.current++; } }} title="Chi tiết rút tiền" description="Trạng thái và lịch sử xử lý từ hệ thống.">
      {detail ? <div className="withdrawals"><WithdrawalInformation item={detail} />{error ? <p role="alert">{error}</p> : null}
        {detail.status === 'PENDING' ? <form className="withdrawal-form" onSubmit={event => void cancel(event)}><label>Lý do hủy<textarea required maxLength={500} value={cancelReason} onChange={e => setCancelReason(e.target.value)} /></label><Button type="submit" variant="outline" disabled={busy || !cancelReason.trim()}>Hủy yêu cầu rút tiền</Button></form> : null}</div> : null}
    </Modal>
  </div>;
}
