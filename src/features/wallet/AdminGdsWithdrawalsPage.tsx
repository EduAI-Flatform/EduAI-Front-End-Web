import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { useAuthSession } from '../auth/auth-store';
import { gdsWithdrawalService, WITHDRAWAL_STATUSES, withdrawalLabels, withdrawalError, type Withdrawal, type WithdrawalPage, type WithdrawalSettings } from '../../services/gds-withdrawal.service';
import { WithdrawalRecords } from './WithdrawalRecords';
import { WithdrawalSettingsForm } from './WithdrawalSettingsForm';
import { AdminWithdrawalDetail } from './AdminWithdrawalDetail';
import { HistoricalRevenueReviews } from './HistoricalRevenueReviews';
import './Withdrawals.css';

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
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try {
      const [policy, history] = await Promise.all([gdsWithdrawalService.adminSettings(), gdsWithdrawalService.adminList(page, status)]);
      if (current === generation.current) { setSettings(policy); setRecords(history); }
    } catch (cause) { if (current === generation.current) setError(withdrawalError(cause)); }
    finally { if (current === generation.current) setLoading(false); }
  }, [page, status]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  async function select(id: string) {
    setError('');
    try { setDetail(await gdsWithdrawalService.adminDetail(id)); }
    catch (cause) { setError(withdrawalError(cause)); }
  }
  return <div className="withdrawals withdrawal-admin">
    <header><h1>Rút tiền GDS</h1><p>Duyệt yêu cầu và đối soát chuyển khoản thủ công cho học viên, giảng viên.</p></header>
    {error ? <p role="alert">{error}</p> : null}
    {settings ? <WithdrawalSettingsForm settings={settings} onSaved={setSettings} /> : loading ? <p role="status">Đang tải cấu hình…</p> : null}
    <nav className="withdrawal-actions" aria-label="Nghiệp vụ rút tiền"><Button type="button" variant={tab === 'withdrawals' ? 'default' : 'outline'} aria-pressed={tab === 'withdrawals'} onClick={() => setTab('withdrawals')}>Yêu cầu rút tiền</Button><Button type="button" variant={tab === 'revenue' ? 'default' : 'outline'} aria-pressed={tab === 'revenue'} onClick={() => setTab('revenue')}>Đối soát doanh thu cũ</Button></nav>
    {tab === 'revenue' ? <HistoricalRevenueReviews actorId={actorId} /> : <section className="withdrawal-panel"><div className="withdrawal-heading"><h2>Hàng đợi xử lý</h2><Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>Tải lại danh sách</Button></div>
      <label className="withdrawal-filter">Trạng thái<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả</option>{WITHDRAWAL_STATUSES.map(value => <option key={value} value={value}>{withdrawalLabels[value]}</option>)}</select></label>
      <WithdrawalRecords data={records} loading={loading} page={page} onPage={setPage} onSelect={id => void select(id)} />
    </section>}
    {detail ? <AdminWithdrawalDetail key={detail.id + detail.status} item={detail} processingEnabled={settings?.processingEnabled === true} actorId={actorId} onClose={() => setDetail(null)} onChanged={value => { setDetail(value); void load(); }} /> : null}
  </div>;
}
