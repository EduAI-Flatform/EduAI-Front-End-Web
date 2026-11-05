import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Clock3, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatGdsVnd } from '../../services/gds-wallet.service';
import { withdrawalDate, type WithdrawalPage } from '../../services/gds-withdrawal.service';
import { buildGdsHistory, type GdsJournalEntry } from './gds-history';
import './GdsTransactionHistory.css';

interface Props {
  transactions?: GdsJournalEntry[]; withdrawals?: WithdrawalPage | null; loading?: boolean;
  error?: string; page?: number; onPage?: (page: number) => void; onSelect?: (id: string) => void;
  onRefresh?: () => void; busy?: boolean;
}
export function GdsTransactionHistory({ transactions, withdrawals, loading = false, error = '', page = 1, onPage, onSelect, onRefresh, busy = false }: Props) {
  const [filter, setFilter] = useState<'all' | 'withdrawals'>('all');
  const currentRequests = withdrawals?.page === page && (filter === 'withdrawals' || page === 1) ? withdrawals.items : [];
  const all = buildGdsHistory(transactions ?? [], currentRequests);
  const rows = filter === 'all' ? all.slice(0, 20) : buildGdsHistory([], currentRequests);
  return <section className="gds-history" aria-labelledby="gds-history-title" aria-busy={loading}>
    <header className="gds-history-heading"><div><h2 id="gds-history-title">Lịch sử giao dịch</h2><p>{filter === 'all' ? 'Các hoạt động GDS gần đây' : 'Theo dõi toàn bộ yêu cầu rút tiền'}</p></div>
      {onRefresh ? <Button type="button" variant="ghost" aria-label="Tải lại lịch sử giao dịch" disabled={loading || busy} onClick={onRefresh}><RefreshCw size={18} aria-hidden="true" /></Button> : null}</header>
    {onSelect ? <div className="gds-history-filters" role="group" aria-label="Lọc lịch sử giao dịch"><button type="button" aria-label="Lọc: Tất cả" aria-pressed={filter === 'all'} onClick={() => { setFilter('all'); if (page !== 1) onPage?.(1); }}>Tất cả</button><button type="button" aria-label="Lọc: Rút tiền" aria-pressed={filter === 'withdrawals'} onClick={() => setFilter('withdrawals')}>Rút tiền{withdrawals ? <span>{withdrawals.total}</span> : null}</button></div> : null}
    {error ? <div className="gds-history-error" role="alert"><p>{error}</p>{onRefresh ? <Button type="button" variant="outline" disabled={loading} onClick={onRefresh}>Thử tải lịch sử lại</Button> : null}</div> : null}
    {loading ? <p className="gds-history-state" role="status">Đang tải lịch sử giao dịch…</p> : !rows.length ? <div className="gds-history-state"><Clock3 size={28} aria-hidden="true" /><p>{error ? 'Chưa thể hiển thị đầy đủ lịch sử. Vui lòng thử lại.' : filter === 'withdrawals' ? 'Bạn chưa có yêu cầu rút tiền.' : transactions || withdrawals ? 'Bạn chưa có giao dịch GDS.' : 'Lịch sử giao dịch GDS sẽ hiển thị khi hệ thống sẵn sàng.'}</p></div> : <ul className="gds-history-list" aria-label="Các giao dịch GDS">{rows.map(row => <li key={row.id}>
      <span className={`gds-history-icon${row.income ? ' gds-history-icon--income' : ''}`}>{row.income ? <ArrowDownLeft size={18} aria-hidden="true" /> : <ArrowUpRight size={18} aria-hidden="true" />}</span>
      <div className="gds-history-content"><strong>{row.label}</strong>{row.description ? <p>{row.description}</p> : null}<div className="gds-history-meta"><time dateTime={row.occurredAt}>{withdrawalDate(row.occurredAt)}</time>{row.status ? <span className={`gds-history-status gds-history-status--${row.statusTone ?? 'neutral'}`}>{row.status}</span> : null}</div></div>
      <div className={`gds-history-amount${row.income ? ' gds-history-amount--income' : ''}`}><strong>{row.amountPrefix}{formatGdsVnd(row.amountMinor)}</strong>{row.amountHint ? <small>{row.amountHint}</small> : null}</div>
      {row.withdrawalId && onSelect ? <Button type="button" variant="ghost" className="gds-history-detail" disabled={busy} onClick={() => onSelect(row.withdrawalId!)}>Chi tiết</Button> : null}
    </li>)}</ul>}
    {filter === 'all' && rows.length > 0 ? <p className="gds-history-footnote">Hiển thị tối đa 20 hoạt động gần nhất.{onSelect ? ' Chọn “Rút tiền” để xem tất cả yêu cầu.' : ''}</p> : null}
    {filter === 'withdrawals' && withdrawals && withdrawals.totalPages > 1 ? <nav className="gds-history-pagination" aria-label="Phân trang yêu cầu rút tiền"><Button type="button" variant="outline" disabled={loading || busy || page <= 1} onClick={() => onPage?.(page - 1)}>Trang trước</Button><span>Trang {page}/{withdrawals.totalPages}</span><Button type="button" variant="outline" disabled={loading || busy || page >= withdrawals.totalPages} onClick={() => onPage?.(page + 1)}>Trang sau</Button></nav> : null}
  </section>;
}
