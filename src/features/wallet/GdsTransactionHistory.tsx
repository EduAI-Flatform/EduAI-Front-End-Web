import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Clock3, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatGdsVnd } from '../../services/gds-wallet.service';
import { withdrawalDate, type WithdrawalPage } from '../../services/gds-withdrawal.service';
import { buildGdsHistory, filterGdsHistory, type GdsHistoryFilter, type GdsJournalEntry } from './gds-history';
import './GdsTransactionHistory.css';
import { WithdrawalStatusBadge } from './WithdrawalStatusBadge';

interface Props {
  transactions?: GdsJournalEntry[]; withdrawals?: WithdrawalPage | null; loading?: boolean;
  error?: string; page?: number; onPage?: (page: number) => void; onSelect?: (id: string) => void;
  onRefresh?: () => void; busy?: boolean;
}
export function GdsTransactionHistory({ transactions, withdrawals, loading = false, error = '', page = 1, onPage, onSelect, onRefresh, busy = false }: Props) {
  const [filter, setFilter] = useState<GdsHistoryFilter>('all');
  const currentRequests = withdrawals?.page === page && (filter === 'withdrawals' || page === 1) ? withdrawals.items : [];
  const all = buildGdsHistory(transactions ?? [], currentRequests);
  const recent = all.slice(0, 20);
  const rows = filter === 'withdrawals' ? filterGdsHistory(buildGdsHistory([], currentRequests), filter) : filterGdsHistory(recent, filter);
  return <section className="gds-history" aria-labelledby="gds-history-title" aria-busy={loading}>
    <header className="gds-history-heading"><div><h2 id="gds-history-title" tabIndex={-1}>Lịch sử giao dịch</h2><p>{filter !== 'withdrawals' ? 'Giao dịch gần đây' : 'Theo dõi toàn bộ yêu cầu rút tiền'}</p></div>
      {onRefresh ? <Button type="button" variant="ghost" aria-label="Tải lại lịch sử giao dịch" disabled={loading || busy} onClick={onRefresh}><RefreshCw size={18} aria-hidden="true" /></Button> : null}</header>
    <div className="gds-history-filters" role="group" aria-label="Lọc lịch sử giao dịch">{([['all', 'Tất cả'], ['incoming', 'Tiền vào'], ['outgoing', 'Tiền ra'], ['payments', 'Thanh toán'], ...(onSelect ? [['withdrawals', 'Rút tiền']] : [])] as [GdsHistoryFilter, string][]).map(([value, label]) => <button key={value} type="button" aria-label={`Lọc: ${label}`} aria-pressed={filter === value} onClick={() => { setFilter(value); if (value !== 'withdrawals' && page !== 1) onPage?.(1); }}>{label}</button>)}</div>
    {error ? <div className="gds-history-error" role="alert"><p>{error}</p>{onRefresh ? <Button type="button" variant="outline" disabled={loading} onClick={onRefresh}>Thử tải lịch sử lại</Button> : null}</div> : null}
    {loading ? <p className="gds-history-state" role="status">Đang tải lịch sử giao dịch…</p> : !rows.length ? <div className="gds-history-state"><Clock3 size={28} aria-hidden="true" /><p>{error ? 'Chưa thể hiển thị đầy đủ lịch sử. Vui lòng thử lại.' : filter === 'withdrawals' ? 'Bạn chưa có yêu cầu rút tiền.' : filter !== 'all' ? 'Chưa có giao dịch phù hợp.' : transactions || withdrawals ? 'Bạn chưa có giao dịch GDS.' : 'Lịch sử giao dịch GDS sẽ hiển thị khi hệ thống sẵn sàng.'}</p></div> : <ul className="gds-history-list" aria-label="Các giao dịch GDS">{rows.map(row => <li key={row.id}>
      <span className={`gds-history-icon${row.income ? ' gds-history-icon--income' : ''}`}>{row.income ? <ArrowDownLeft size={18} aria-hidden="true" /> : <ArrowUpRight size={18} aria-hidden="true" />}</span>
      <div className="gds-history-content"><strong>{row.label}</strong>{row.description ? <p>{row.description}</p> : null}<div className="gds-history-meta"><time dateTime={row.occurredAt}>{withdrawalDate(row.occurredAt)}</time>{row.status ? <WithdrawalStatusBadge label={row.status} tone={row.statusTone} /> : null}</div></div>
      <div className={`gds-history-amount${row.income ? ' gds-history-amount--income' : ''}`}><strong>{row.amountPrefix}{formatGdsVnd(row.amountMinor)}</strong>{row.amountHint ? <small>{row.amountHint}</small> : null}</div>
      {row.withdrawalId && onSelect ? <Button type="button" variant="ghost" className="gds-history-detail" disabled={busy} onClick={() => onSelect(row.withdrawalId!)}>Chi tiết</Button> : null}
    </li>)}</ul>}
    {filter !== 'withdrawals' && rows.length > 0 ? <p className="gds-history-footnote">Hiển thị tối đa 20 hoạt động gần nhất.{onSelect ? ' Chọn “Rút tiền” để xem tất cả yêu cầu.' : ''}</p> : null}
    {filter === 'withdrawals' && withdrawals && withdrawals.totalPages > 1 ? <nav className="gds-history-pagination" aria-label="Phân trang yêu cầu rút tiền"><Button type="button" variant="outline" disabled={loading || busy || page <= 1} onClick={() => onPage?.(page - 1)}>Trang trước</Button><span>Trang {page}/{withdrawals.totalPages}</span><Button type="button" variant="outline" disabled={loading || busy || page >= withdrawals.totalPages} onClick={() => onPage?.(page + 1)}>Trang sau</Button></nav> : null}
  </section>;
}
