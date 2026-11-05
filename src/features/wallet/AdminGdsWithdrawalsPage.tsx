import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { ArrowRight, Landmark, RefreshCw, Settings2 } from 'lucide-react';
import { formatGdsVnd } from '../../services/gds-wallet.service';
import { useAuthSession } from '../auth/auth-store';
import { gdsWithdrawalService, WITHDRAWAL_STATUSES, withdrawalLabels, withdrawalError, type Withdrawal, type WithdrawalPage, type WithdrawalSettings } from '../../services/gds-withdrawal.service';
import { WithdrawalRecords } from './WithdrawalRecords';
import { WithdrawalSettingsForm } from './WithdrawalSettingsForm';
import { AdminWithdrawalDetail } from './AdminWithdrawalDetail';
import { HistoricalRevenueReviews } from './HistoricalRevenueReviews';
import './Withdrawals.css';
import './AdminGdsWithdrawalsPage.css';

export function AdminGdsWithdrawalsPage() {
  const actorId = useAuthSession()?.user.id;
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);
  const [records, setRecords] = useState<WithdrawalPage | null>(null);
  const [detail, setDetail] = useState<Withdrawal | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState<'withdrawals' | 'revenue'>('withdrawals');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState(false);
  const generation = useRef(0);
  const detailGeneration = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try {
      const [policy, history] = await Promise.all([gdsWithdrawalService.adminSettings(), gdsWithdrawalService.adminList(page, status)]);
      if (current === generation.current) { setSettings(policy); setRecords(history); }
    } catch (cause) { if (current === generation.current) setError(withdrawalError(cause)); }
    finally { if (current === generation.current) setLoading(false); }
  }, [page, status]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  useEffect(() => () => { detailGeneration.current++; }, []);
  async function select(id: string) {
    const version = ++detailGeneration.current; setError(''); setSelecting(true);
    try { const result = await gdsWithdrawalService.adminDetail(id); if (version === detailGeneration.current) setDetail(result); }
    catch (cause) { if (version === detailGeneration.current) setError(withdrawalError(cause)); }
    finally { if (version === detailGeneration.current) setSelecting(false); }
  }
  const currentRecords = records?.page === page && !loading && !error ? records : null;
  return <div className="withdrawals withdrawal-admin admin-gds-withdrawals">
    <header className="admin-gds-header"><span className="admin-gds-header-icon"><Landmark size={25} aria-hidden="true" /></span><div><p className="admin-gds-eyebrow">Vận hành ví</p><h1>Rút tiền GDS</h1><p>Đối chiếu người nhận và chuyển khoản thủ công cho học viên, giảng viên.</p></div></header>
    <ol className="admin-gds-guide" aria-label="Hướng dẫn xử lý"><li><span>01</span><div><strong>Đối chiếu & duyệt</strong><p>Kiểm tra tên trên ứng dụng ngân hàng. Sai thông tin thì từ chối.</p></div></li><li><ArrowRight size={17} aria-hidden="true" /><span>02</span><div><strong>Nhận chuyển khoản</strong><p>Nhận xử lý độc quyền để mở QR đúng yêu cầu.</p></div></li><li><ArrowRight size={17} aria-hidden="true" /><span>03</span><div><strong>Xác nhận kết quả</strong><p>Lưu mã giao dịch, thời điểm chuyển và ghi chú đối soát.</p></div></li></ol>
    {error ? <p role="alert">{error}</p> : null}
    {settings ? <details className="admin-gds-settings"><summary><Settings2 size={18} aria-hidden="true" /><strong>Cấu hình hạn mức</strong><span>{formatGdsVnd(settings.minimumMinor)} – {formatGdsVnd(settings.maximumMinor)} / lần</span><small>Miễn phí rút tiền</small></summary><WithdrawalSettingsForm settings={settings} onSaved={setSettings} /></details> : loading ? <p role="status">Đang tải cấu hình…</p> : null}
    <nav className="withdrawal-actions" aria-label="Nghiệp vụ rút tiền"><Button type="button" variant={tab === 'withdrawals' ? 'default' : 'outline'} aria-pressed={tab === 'withdrawals'} onClick={() => setTab('withdrawals')}>Yêu cầu rút tiền</Button><Button type="button" variant={tab === 'revenue' ? 'default' : 'outline'} aria-pressed={tab === 'revenue'} onClick={() => setTab('revenue')}>Đối soát doanh thu cũ</Button></nav>
    {tab === 'revenue' ? <HistoricalRevenueReviews actorId={actorId} /> : <section className="withdrawal-panel admin-gds-queue"><div className="withdrawal-heading"><div><h2>Hàng đợi xử lý</h2><p>{currentRecords ? `${currentRecords.total} yêu cầu${status ? ` · ${withdrawalLabels[status as keyof typeof withdrawalLabels]}` : ''}` : 'Theo dõi trạng thái và tiếp tục xử lý yêu cầu'}</p></div><Button type="button" variant="outline" disabled={loading} onClick={() => void load()}><RefreshCw size={15} aria-hidden="true" />Tải lại danh sách</Button></div>
      <div className="admin-gds-quick-filters" role="group" aria-label="Lọc nhanh trạng thái">{[['', 'Tất cả'], ['PENDING', 'Chờ duyệt'], ['APPROVED', 'Đã duyệt'], ['PROCESSING', 'Đang chuyển khoản'], ['PAID', 'Đã chi']].map(([value, label]) => <button type="button" key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}>{label}</button>)}</div>
      <label className="withdrawal-filter">Trạng thái<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả</option>{WITHDRAWAL_STATUSES.map(value => <option key={value} value={value}>{withdrawalLabels[value]}</option>)}</select></label>
      {selecting ? <p role="status">Đang mở chi tiết yêu cầu…</p> : null}
      <WithdrawalRecords data={currentRecords} loading={loading} page={page} onPage={setPage} onSelect={id => { if (!selecting) void select(id); }} />
    </section>}
    {detail ? <AdminWithdrawalDetail key={detail.id + detail.status} item={detail} processingEnabled={settings?.processingEnabled === true} verificationRequired={settings?.accountVerificationRequired === true} verificationAvailable={settings?.accountVerificationAvailable === true} actorId={actorId} onClose={() => setDetail(null)} onChanged={value => { setDetail(value); void load(); }} /> : null}
  </div>;
}
