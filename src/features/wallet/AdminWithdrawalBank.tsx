import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { gdsWithdrawalService, withdrawalDate, type AccountVerification, type GdsBank, type Withdrawal, type WithdrawalQr } from '../../services/gds-withdrawal.service';
import { formatGdsVnd } from '../../services/gds-wallet.service';
import { BankLogo } from './BankPicker';
import './AdminWithdrawalBank.css';

export function AdminWithdrawalBank({ item, actorId }: { item: Withdrawal; actorId?: string }) {
  const [verification, setVerification] = useState<AccountVerification | null>(null);
  const [qr, setQr] = useState<WithdrawalQr | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [banks, setBanks] = useState<GdsBank[]>([]);
  const generation = useRef(0);
  const eligible = !!actorId && item.ownerId !== actorId && item.status === 'PROCESSING' && item.processingAdminId === actorId;
  const visibleQr = eligible && qr?.withdrawalId === item.id && Date.parse(qr.expiresAt) > Date.now() ? qr : null;
  const currentVerification = verification && Date.parse(verification.expiresAt) > Date.now() ? verification : null;
  const verifiedAt = currentVerification?.verifiedAt ?? visibleQr?.verifiedAt;
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f\s]/g, '').toLowerCase();
  const bank = banks.find(value => [value.code, value.bin, value.shortName].some(alias => normalize(alias) === normalize(item.bankCode)));
  useEffect(() => { let active = true; void gdsWithdrawalService.adminBanks().then(value => { if (active && Array.isArray(value.banks)) setBanks(value.banks); }, () => {}); return () => { active = false; }; }, []);
  useEffect(() => { generation.current++; setQr(null); setVerification(null); setError(''); setBusy(false); return () => { generation.current++; }; }, [item.id, item.status, item.processingAdminId, actorId]);
  useEffect(() => { if (!qr) return; const timer = window.setTimeout(() => { setQr(null); setNotice('QR đã hết hạn. Kiểm tra lại trước khi chuyển khoản.'); }, Math.max(0, Date.parse(qr.expiresAt) - Date.now())); return () => window.clearTimeout(timer); }, [qr]);
  useEffect(() => { if (!verification) return; const timer = window.setTimeout(() => { setVerification(null); setQr(null); setNotice('Xác minh đã hết hạn. Xác minh lại người nhận trước khi lấy QR; trạng thái và tiền đang giữ được giữ nguyên.'); }, Math.max(0, Date.parse(verification.expiresAt) - Date.now())); return () => window.clearTimeout(timer); }, [verification]);
  async function verify() {
    const version = ++generation.current; setBusy(true); setError(''); setQr(null);
    try { const result = await gdsWithdrawalService.adminVerifyAccount(item.id); if (version === generation.current) { setVerification(result); setNotice(''); } }
    catch { if (version === generation.current) { setVerification(null); setError('Không thể xác minh người nhận hoặc tên không khớp yêu cầu. Kiểm tra lại; không chuyển khoản khi chưa xác định đúng người nhận.'); } }
    finally { if (version === generation.current) setBusy(false); }
  }
  async function loadQr() {
    if (!eligible) return;
    const version = ++generation.current; setBusy(true); setError(''); setQr(null);
    try {
      const result = await gdsWithdrawalService.qr(item.id);
      if (version !== generation.current) return;
      if (result.withdrawalId !== item.id || result.accountNumber !== item.accountNumber || result.amountMinor !== item.amountMinor || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(result.qrCodeDataUrl) || !Number.isFinite(Date.parse(result.expiresAt)) || Date.parse(result.expiresAt) <= Date.now()) throw new Error('QR_UNAVAILABLE');
      setQr(result);
    } catch { if (version === generation.current) setError('Chưa thể lấy QR đã xác minh. Kiểm tra lại người nhận trước khi chuyển khoản. Việc đối soát khoản đã chuyển vẫn tiếp tục theo quy trình hiện tại.'); }
    finally { if (version === generation.current) setBusy(false); }
  }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setNotice('Đã sao chép.'); } catch { setNotice('Không thể sao chép tự động. Bạn có thể chọn và sao chép nội dung hiển thị.'); } }
  return <section className="admin-withdrawal-bank" aria-label="Thông tin ngân hàng và chuyển khoản">
    <div className="admin-withdrawal-recipient"><h3>Thông tin nhận tiền</h3><div className="admin-withdrawal-brand"><BankLogo code={bank?.code ?? item.bankCode} /><div><strong>{item.bankShortName ?? bank?.shortName ?? item.bankCode}</strong><p>{item.bankName ?? bank?.name}</p></div></div>
      <dl><div><dt>Số tài khoản</dt><dd>{item.accountNumber} <Button type="button" variant="ghost" onClick={() => void copy(item.accountNumber)}>Sao chép tài khoản</Button></dd></div><div><dt>Người nhận</dt><dd>{item.accountHolder} <Button type="button" variant="ghost" onClick={() => void copy(item.accountHolder)}>Sao chép tên</Button></dd></div></dl>
      <p>{verifiedAt ? `✓ Đã xác minh người nhận · ${withdrawalDate(verifiedAt)}` : item.accountVerifiedAt ? `Đã xác minh khi gửi · ${withdrawalDate(item.accountVerifiedAt)}` : 'Chưa có chứng cứ xác minh người nhận.'}</p>
      {(['PENDING', 'APPROVED'].includes(item.status) || eligible) && item.ownerId !== actorId && actorId ? <><Button type="button" variant="outline" disabled={busy} onClick={() => void verify()}>{busy ? 'Đang kiểm tra tài khoản…' : 'Xác minh tài khoản nhận'}</Button>{eligible ? <p>Xác minh lại khi hết hạn trước khi lấy QR. Thao tác này không thay đổi trạng thái hay tiền đang giữ.</p> : null}</> : null}
    </div>
    <div className="admin-withdrawal-payment"><h3>Thông tin chi</h3><strong className="admin-withdrawal-amount">{formatGdsVnd(item.amountMinor)}</strong><Button type="button" variant="ghost" onClick={() => void copy(item.amountMinor)}>Sao chép số tiền</Button><p>Phí rút tiền: 0đ</p>
      {eligible ? <><Button type="button" variant="outline" disabled={busy} onClick={() => void loadQr()}>{busy ? 'Đang kiểm tra và tải QR…' : visibleQr ? 'Làm mới QR chuyển khoản' : 'Lấy QR chuyển khoản'}</Button>{visibleQr ? <><img className="admin-withdrawal-qr" src={visibleQr.qrCodeDataUrl} alt={`QR chuyển khoản yêu cầu ${item.id}`} /><p>Nội dung: <strong>{visibleQr.transferContent}</strong></p><Button type="button" variant="ghost" onClick={() => void copy(visibleQr.transferContent)}>Sao chép nội dung</Button><p>Xác minh lúc {withdrawalDate(visibleQr.verifiedAt)}</p></> : null}</> : <p>QR chỉ dành cho admin đã nhận xử lý, khi yêu cầu đang chuyển khoản và người nhận đã xác minh.</p>}
      <p className="withdrawal-notice">Quét QR chưa đồng nghĩa đã chuyển tiền.</p>
    </div>{busy ? <p role="status">Đang kiểm tra thông tin ngân hàng…</p> : null}{error ? <p role="alert">{error}</p> : null}{notice ? <p role="status">{notice}</p> : null}
  </section>;
}
