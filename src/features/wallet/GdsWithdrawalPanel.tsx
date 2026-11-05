import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Info, Landmark, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { ApiClientError } from '../../services/api-client';
import { formatGdsVnd, type GdsWalletSummary } from '../../services/gds-wallet.service';
import { canSubmitWithdrawal, gdsWithdrawalService, withdrawalError, withdrawalDate, type GdsBanks, type Withdrawal, type WithdrawalInput, type WithdrawalSettings } from '../../services/gds-withdrawal.service';
import { WithdrawalInformation } from './WithdrawalRecords';
import { GdsWalletActivity } from './GdsWalletActivity';
import { BankLogo, BankPicker } from './BankPicker';
import { GdsWithdrawalAction } from './GdsWithdrawalAction';
import { useAccountVerification } from './useAccountVerification';
import './Withdrawals.css';
import './GdsWithdrawalForm.css';

const emptyInput: WithdrawalInput = { amountMinor: '', bankCode: '', accountNumber: '', accountHolder: '' };
const normalizeManualHolder = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'D').toUpperCase().replace(/[^A-Z ]/g, '');
export function GdsWithdrawalPanel({ summary, onChanged, renderOverview }: { summary: GdsWalletSummary; onChanged: () => void; renderOverview?: (controls: { onWithdraw: () => void; withdrawDisabled: boolean }) => ReactNode }) {
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(false);
  const [input, setInput] = useState(emptyInput);
  const [detail, setDetail] = useState<Withdrawal | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const request = useRef<{ key: string; payload: WithdrawalInput } | null>(null);
  const formElement = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const dialog = formElement.current?.closest('[role="dialog"]');
    if (open && dialog) dialog.scrollTop = 0;
  }, [open, review]);
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
    setLoading(true);
    try {
      const policy = await gdsWithdrawalService.settings();
      if (generation === listGeneration.current) { setSettings(policy); setHistoryRevision(value => value + 1); }
    } catch { if (generation === listGeneration.current) setError('Chưa tải được hạn mức rút tiền. Vui lòng thử lại.'); }
    finally { if (generation === listGeneration.current) setLoading(false); }
  }, []);
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
      setDetail(created); setNotice('Đã gửi yêu cầu rút tiền.');
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
  const onWithdraw = () => { setOpen(true); setReview(!!request.current); setError(''); };
  const withdrawDisabled = loading || busy || summary.withdrawalEnabled !== true || !settings?.admissionEnabled;
  return <div className="withdrawals gds-withdrawal-feature">
    {renderOverview ? renderOverview({ onWithdraw, withdrawDisabled }) : <GdsWithdrawalAction summary={summary} settings={settings} disabled={withdrawDisabled} onWithdraw={onWithdraw} />}
    {!loading && settings && !settings.admissionEnabled ? <p role="status">Đang tạm ngừng nhận yêu cầu mới. Yêu cầu đã gửi vẫn được theo dõi bên dưới.</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {error && !open && !detail ? <p role="alert">{error}</p> : null}
    <GdsWalletActivity revision={`${historyRevision}:${summary.balance?.availableMinor}:${summary.balance?.reservedMinor}:${summary.debtMinor}`} busy={busy} onSelect={id => void select(id)} onRefresh={onChanged} />
    <Modal open={open} className="gds-withdrawal-modal" onOpenChange={value => { if (!busy) setOpen(value); }} title={<span className="gds-withdrawal-modal-title"><span className="gds-withdrawal-modal-icon" aria-hidden="true">{review ? <ShieldCheck size={23} /> : <Landmark size={23} />}</span><span>{review ? 'Xác nhận yêu cầu rút tiền' : 'Rút tiền về ngân hàng'}</span></span>} description="Kiểm tra thông tin tài khoản trước khi gửi.">
      <ol className="gds-withdrawal-steps" aria-label="Các bước rút tiền"><li aria-current={!review ? 'step' : undefined} className={review ? 'is-complete' : 'is-active'}><span aria-hidden="true">{review ? <Check size={14} /> : '1'}</span>Thông tin</li><li aria-current={review ? 'step' : undefined} className={review ? 'is-active' : ''}><span aria-hidden="true">2</span>Xác nhận</li></ol>
      <form ref={formElement} className={`withdrawals withdrawal-form gds-withdrawal-form${review ? ' is-review' : ''}`} onSubmit={event => void create(event)}><fieldset disabled={busy}>
        {review ? <div className="gds-withdrawal-confirm-amount"><span>Số tiền yêu cầu rút</span><strong>{formatGdsVnd(effectiveInput.amountMinor)}</strong><small>Phí rút tiền: 0đ · Miễn phí</small></div> : <div className="gds-withdrawal-amount-block">
          <label htmlFor="gds-withdrawal-amount">Số tiền rút (VND)</label><div className="gds-withdrawal-amount-control"><input id="gds-withdrawal-amount" required autoComplete="off" inputMode="numeric" maxLength={19} placeholder="0" value={input.amountMinor} onChange={event => setInput(current => ({ ...current, amountMinor: event.target.value }))} /><span aria-hidden="true">VND</span></div>
          <div className="gds-withdrawal-amount-info"><p>Số dư khả dụng <strong>{formatGdsVnd(summary.balance?.availableMinor)}</strong></p><p>Hạn mức {settings ? `${formatGdsVnd(settings.minimumMinor)} – ${formatGdsVnd(settings.maximumMinor)}` : 'Đang tải…'}</p></div>
        </div>}
        <div className="gds-withdrawal-recipient"><h3><Landmark size={17} aria-hidden="true" />Tài khoản nhận tiền</h3>
        {bankLoading ? <p role="status">Đang tải danh sách ngân hàng…</p> : bankError ? <div role="alert"><p>Không thể tải danh sách ngân hàng.</p><Button type="button" variant="outline" onClick={() => void loadBanks()}>Thử tải ngân hàng lại</Button></div> : null}
        {review ? <div className="gds-withdrawal-confirm-bank"><BankLogo code={effectiveInput.bankCode} /><div><strong>{selectedBank?.shortName ?? effectiveInput.bankCode}</strong><span>{selectedBank?.name}</span></div></div> : <BankPicker banks={banks?.banks ?? []} value={input.bankCode} disabled={busy || bankLoading || bankError} verificationRequired={verificationRequired} onChange={bankCode => setInput(current => ({ ...current, bankCode, accountHolder: '' }))} />}
        <label>Số tài khoản<input required autoComplete="off" inputMode="numeric" maxLength={verificationRequired ? 19 : 34} readOnly={review} value={input.accountNumber} aria-describedby={verificationRequired ? 'gds-account-verification' : undefined} aria-invalid={verificationRequired && verification.state === 'invalid'} onChange={event => setInput(current => ({ ...current, accountNumber: event.target.value, accountHolder: verificationRequired ? '' : current.accountHolder }))} /></label>
        {verificationRequired ? <div id="gds-account-verification" className={`gds-withdrawal-verification${verification.result ? ' is-verified' : ''}`} aria-live="polite">
          {verification.result ? <p>✓ Đã xác minh người nhận · {withdrawalDate(verification.result.verifiedAt)}</p> : banks && !verificationAvailable ? <p>Dịch vụ xác minh đang tạm thời chưa sẵn sàng. Vui lòng thử lại sau.</p> : verification.state === 'loading' ? <p role="status">Đang kiểm tra tài khoản…</p> : verification.state === 'invalid' ? <p role="alert">Tài khoản không hợp lệ. Kiểm tra lại ngân hàng và số tài khoản.</p> : ['error', 'expired'].includes(verification.state) ? <><p role="alert">{verification.state === 'expired' ? 'Kết quả xác minh đã hết hạn.' : 'Chưa thể xác minh tài khoản. Vui lòng thử lại.'}</p><Button type="button" variant="outline" onClick={verification.retry} disabled={busy}>Thử xác minh lại</Button></> : <p>Chọn ngân hàng và nhập số tài khoản từ 6–19 chữ số để xác minh người nhận.</p>}
        </div> : null}
        <div className="gds-withdrawal-name"><div className="gds-withdrawal-field-heading"><label htmlFor="gds-withdrawal-holder">Tên chủ tài khoản</label><span className="gds-withdrawal-entry-mode">{verificationRequired ? 'Tra tên tự động' : 'Bạn cung cấp'}</span></div><input id="gds-withdrawal-holder" required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={160} placeholder="NGUYEN VAN A" aria-describedby={!verificationRequired ? 'gds-holder-format' : undefined} readOnly={review || verificationRequired} value={effectiveInput.accountHolder} onChange={event => setInput(current => ({ ...current, accountHolder: normalizeManualHolder(event.target.value) }))} />{!verificationRequired ? <small id="gds-holder-format">Chỉ dùng chữ IN HOA không dấu và dấu cách.</small> : null}</div>
        {!verificationRequired ? <p className="gds-withdrawal-manual-note"><Info size={17} aria-hidden="true" /><span>Tên chưa được xác minh tự động. Vui lòng kiểm tra đúng tên trên tài khoản ngân hàng trước khi gửi.</span></p> : null}
        </div>
        {review ? <p className="gds-withdrawal-submit-note"><ShieldCheck size={18} aria-hidden="true" /><span>Chỉ sau khi xác nhận, {formatGdsVnd(effectiveInput.amountMinor)} mới được chuyển sang đang giữ. Thông tin nhận tiền không thể sửa sau khi gửi.</span></p> : <div className="gds-withdrawal-fee"><span>Phí rút tiền</span><strong>0đ <small>Miễn phí</small></strong></div>}
        <div className="gds-withdrawal-form-footer">{error ? <p className="gds-withdrawal-form-error" role="alert">{error}</p> : null}{review ? <Button type="button" variant="outline" disabled={busy || !!request.current} onClick={() => setReview(false)}><ArrowLeft size={16} aria-hidden="true" />Sửa thông tin</Button> : <span className="gds-withdrawal-form-disclaimer">Kiểm tra thông tin trước khi gửi</span>}<Button type="submit" disabled={!valid || busy}>{busy ? 'Đang gửi…' : review ? 'Xác nhận gửi yêu cầu' : 'Kiểm tra yêu cầu'}{!busy ? <ArrowUpRight size={17} aria-hidden="true" /> : null}</Button></div>
      </fieldset></form>
    </Modal>
    <Modal open={!!detail} onOpenChange={value => { if (!value && !busy) { setDetail(null); detailGeneration.current++; } }} title="Chi tiết rút tiền" description="Trạng thái và lịch sử xử lý từ hệ thống.">
      {detail ? <div className="withdrawals"><WithdrawalInformation item={detail} />{error ? <p role="alert">{error}</p> : null}
        {detail.status === 'PENDING' ? <form className="withdrawal-form withdrawal-cancel-form" onSubmit={event => void cancel(event)}><label>Lý do hủy<textarea required maxLength={500} placeholder="Nhập lý do bạn muốn hủy yêu cầu" value={cancelReason} onChange={e => setCancelReason(e.target.value)} /></label><Button type="submit" variant="outline" disabled={busy || !cancelReason.trim()}>Hủy yêu cầu rút tiền</Button></form> : null}</div> : null}
    </Modal>
  </div>;
}
