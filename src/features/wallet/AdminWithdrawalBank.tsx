import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCheck, Copy, Info, QrCode } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { gdsWithdrawalService, withdrawalDate, withdrawalError, type AccountVerification, type GdsBank, type Withdrawal, type WithdrawalQr } from '../../services/gds-withdrawal.service';
import { BankLogo } from './BankPicker';
import './AdminWithdrawalBank.css';

export function AdminWithdrawalBank({ item, actorId, verificationAvailable = true, onVerified }: { item: Withdrawal; actorId?: string; verificationAvailable?: boolean; onVerified?: (proof: AccountVerification | null) => void }) {
  const [verification, setVerification] = useState<AccountVerification | null>(null);
  const [qr, setQr] = useState<WithdrawalQr | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [banks, setBanks] = useState<GdsBank[]>([]);
  const generation = useRef(0);
  const eligible = !!actorId && item.ownerId !== actorId && item.status === 'PROCESSING' && item.processingAdminId === actorId;
  const terminal = !['PENDING', 'APPROVED', 'PROCESSING'].includes(item.status);
  const visibleQr = eligible && qr?.withdrawalId === item.id && Date.parse(qr.expiresAt) > Date.now() ? qr : null;
  const savedCheck = item.recipientCheck;
  const checkedAt = verification?.verifiedAt ?? visibleQr?.verifiedAt ?? savedCheck?.verifiedAt;
  const manual = !verification && (visibleQr?.verificationMethod === 'MANUAL' || savedCheck?.method === 'MANUAL');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f\s]/g, '').toLowerCase();
  const bank = banks.find(value => [value.code, value.bin, value.shortName].some(alias => normalize(alias) === normalize(item.bankCode)));
  useEffect(() => { let active = true; void gdsWithdrawalService.adminBanks().then(value => { if (active && Array.isArray(value.banks)) setBanks(value.banks); }, () => {}); return () => { active = false; }; }, []);
  const loadQr = useCallback(async () => {
    if (!eligible) return;
    const version = ++generation.current; setBusy(true); setError(''); setQr(null);
    try {
      const result = await gdsWithdrawalService.qr(item.id);
      if (version !== generation.current) return;
      if (result.withdrawalId !== item.id || result.accountNumber !== item.accountNumber || result.amountMinor !== item.amountMinor || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(result.qrCodeDataUrl) || !Number.isFinite(Date.parse(result.expiresAt)) || Date.parse(result.expiresAt) <= Date.now()) throw new Error('QR_UNAVAILABLE');
      setQr(result); setNotice('');
    } catch (cause) { if (version === generation.current) setError(withdrawalError(cause)); }
    finally { if (version === generation.current) setBusy(false); }
  }, [eligible, item.id, item.accountNumber, item.amountMinor]);
  useEffect(() => {
    generation.current++; setQr(null); setVerification(null); setError(''); setBusy(false);
    if (eligible) void loadQr();
    return () => { generation.current++; };
  }, [eligible, item.id, item.status, item.processingAdminId, actorId, item.recipientCheck?.verifiedAt, loadQr]);
  useEffect(() => { if (!qr) return; const timer = window.setTimeout(() => { setQr(null); setNotice('QR đã hết hạn. Đối chiếu lại người nhận trước khi làm mới QR; không chuyển lại nếu kết quả ngân hàng chưa rõ.'); }, Math.max(0, Date.parse(qr.expiresAt) - Date.now())); return () => window.clearTimeout(timer); }, [qr]);
  useEffect(() => { if (!verification) return; const timer = window.setTimeout(() => { setVerification(null); setQr(null); onVerified?.(null); setNotice('Kết quả tra cứu đã hết hạn. Kiểm tra lại người nhận; trạng thái và tiền đang giữ được giữ nguyên.'); }, Math.max(0, Date.parse(verification.expiresAt) - Date.now())); return () => window.clearTimeout(timer); }, [verification, onVerified]);
  async function verify() {
    const version = ++generation.current; setBusy(true); setError(''); setQr(null);
    try { const result = await gdsWithdrawalService.adminVerifyAccount(item.id); if (version === generation.current) { setVerification(result); onVerified?.(result); setNotice(''); } }
    catch (cause) { if (version === generation.current) { setVerification(null); onVerified?.(null); setError(withdrawalError(cause)); } }
    finally { if (version === generation.current) setBusy(false); }
  }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setNotice('Đã sao chép.'); } catch { setNotice('Không thể sao chép tự động. Bạn có thể chọn và sao chép nội dung hiển thị.'); } }
  return <section className={`admin-withdrawal-bank${eligible ? ' has-transfer' : ''}`} aria-label="Thông tin ngân hàng và chuyển khoản">
    <div className="admin-withdrawal-recipient"><h3>Tài khoản nhận tiền</h3><div className="admin-withdrawal-brand"><BankLogo code={bank?.code ?? item.bankCode} /><div><strong>{item.bankShortName ?? bank?.shortName ?? item.bankCode}</strong><p>{item.bankName ?? bank?.name}</p></div></div>
      <dl><div><dt>Số tài khoản</dt><dd><strong>{item.accountNumber}</strong><Button type="button" variant="ghost" onClick={() => void copy(item.accountNumber)}><Copy size={15} aria-hidden="true" />Sao chép tài khoản</Button></dd></div><div><dt>Người nhận</dt><dd><strong>{item.accountHolder}</strong><Button type="button" variant="ghost" onClick={() => void copy(item.accountHolder)}><Copy size={15} aria-hidden="true" />Sao chép tên</Button></dd></div></dl>
      {checkedAt ? <p className="admin-withdrawal-check-result"><CheckCheck size={17} aria-hidden="true" /><span>{manual ? 'Admin đã đối chiếu trên ứng dụng ngân hàng' : '✓ Đã xác minh người nhận qua dịch vụ tra cứu'}<small>{withdrawalDate(checkedAt)}{savedCheck && Date.parse(savedCheck.expiresAt) <= Date.now() && !terminal ? ' · Cần đối chiếu lại trước khi chuyển' : ''}</small></span></p> : <p className="admin-withdrawal-help"><Info size={17} aria-hidden="true" />{item.accountVerifiedAt ? `Đã tra cứu khi gửi · ${withdrawalDate(item.accountVerifiedAt)}` : 'Tên người nhận do người dùng cung cấp. Admin cần đối chiếu trước khi chuyển khoản.'}</p>}
      {!terminal && verificationAvailable && item.ownerId !== actorId && actorId && (['PENDING', 'APPROVED'].includes(item.status) || eligible) ? <Button type="button" variant="outline" disabled={busy} onClick={() => void verify()}>{busy ? 'Đang kiểm tra tài khoản…' : 'Xác minh tài khoản nhận'}</Button> : null}
    </div>
    {eligible ? <div className="admin-withdrawal-payment"><h3><QrCode size={18} aria-hidden="true" />QR chuyển khoản</h3>{visibleQr ? <><img className="admin-withdrawal-qr" src={visibleQr.qrCodeDataUrl} alt={`QR chuyển khoản yêu cầu ${item.id}`} /><dl><div><dt>Nội dung chuyển khoản</dt><dd><strong>{visibleQr.transferContent}</strong><Button type="button" variant="ghost" onClick={() => void copy(visibleQr.transferContent)}><Copy size={15} aria-hidden="true" />Sao chép nội dung</Button></dd></div></dl></> : <div className="admin-withdrawal-qr-empty"><QrCode size={40} aria-hidden="true" /><p>{busy ? 'Đang tạo QR từ thông tin đã lưu…' : 'QR chưa sẵn sàng. Đối chiếu lại người nhận nếu kết quả đã hết hạn.'}</p></div>}
      <Button type="button" variant="outline" disabled={busy} onClick={() => void loadQr()}>{busy ? 'Đang tải QR…' : visibleQr ? 'Làm mới QR chuyển khoản' : 'Lấy QR chuyển khoản'}</Button>
      <p className="withdrawal-notice">Quét QR chưa đồng nghĩa đã chuyển tiền.</p>
    </div> : null}
    {busy ? <p role="status">Đang kiểm tra thông tin ngân hàng…</p> : null}{error ? <p className="admin-withdrawal-error" role="alert">{error}</p> : null}{notice ? <p role="status">{notice}</p> : null}
  </section>;
}
