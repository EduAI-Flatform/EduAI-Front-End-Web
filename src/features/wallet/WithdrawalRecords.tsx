import { formatGdsVnd } from '../../services/gds-wallet.service';
import { withdrawalDate, withdrawalLabels, type Withdrawal, type WithdrawalPage } from '../../services/gds-withdrawal.service';
import { Button } from '../../components/ui/button';
import { BankLogo } from './BankPicker';
import { WithdrawalStatusBadge } from './WithdrawalStatusBadge';

export function WithdrawalRecords({ data, loading, page, onPage, onSelect }: {
  data: WithdrawalPage | null; loading: boolean; page: number;
  onPage: (page: number) => void; onSelect: (id: string) => void;
}) {
  return <div aria-busy={loading}>
    {loading ? <p role="status">Đang tải yêu cầu rút tiền…</p> : !data?.items.length ? <p>Chưa có yêu cầu rút tiền.</p> :
      <ul className="withdrawal-records">{data.items.map(item => <li key={item.id}>
        <div><strong>{formatGdsVnd(item.amountMinor)}</strong><WithdrawalStatusBadge status={item.status} /></div>
        <div><span>{item.bankCode} · {item.accountNumber.replace(/.(?=.{4})/g, '•')}</span><time dateTime={item.createdAt}>{withdrawalDate(item.createdAt)}</time></div>
        <small className="withdrawal-record-reference">Mã yêu cầu · {item.id}</small>
        <Button type="button" variant="outline" onClick={() => onSelect(item.id)}>Xem chi tiết</Button>
      </li>)}</ul>}
    {data && data.totalPages > 1 ? <nav className="withdrawal-actions" aria-label="Phân trang yêu cầu rút tiền">
      <Button type="button" variant="outline" disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>Trang trước</Button>
      <span>Trang {page}/{data.totalPages}</span>
      <Button type="button" variant="outline" disabled={loading || page >= data.totalPages} onClick={() => onPage(page + 1)}>Trang sau</Button>
    </nav> : null}
  </div>;
}

export function WithdrawalSummary({ item }: { item: Withdrawal }) {
  return <div className="withdrawal-detail-summary"><div><span>Số tiền rút</span><strong>{formatGdsVnd(item.amountMinor)}</strong></div><WithdrawalStatusBadge status={item.status} /></div>;
}
export function WithdrawalInformation({ item, hideRecipient = false, hideSummary = false }: { item: Withdrawal; hideRecipient?: boolean; hideSummary?: boolean }) {
  return <div className="withdrawal-information">
    {!hideSummary ? <WithdrawalSummary item={item} /> : null}
    {!hideRecipient ? <section className="withdrawal-detail-recipient" aria-label="Tài khoản nhận tiền"><div className="withdrawal-detail-bank"><BankLogo code={item.bankCode} /><div><span>Ngân hàng nhận</span><strong>{item.bankShortName ?? item.bankName ?? item.bankCode}</strong></div></div><dl><div><dt>Số tài khoản</dt><dd className="withdrawal-detail-account">{item.accountNumber}</dd></div><div><dt>Chủ tài khoản</dt><dd>{item.accountHolder}</dd></div></dl></section> : null}
    <dl className="withdrawal-detail-metadata">
      <div><dt>Mã yêu cầu</dt><dd>{item.id}</dd></div>
      <div><dt>Ngày gửi</dt><dd>{withdrawalDate(item.createdAt)}</dd></div>
      {item.bankTransactionRef ? <div><dt>Mã giao dịch ngân hàng</dt><dd>{item.bankTransactionRef}</dd></div> : null}
      {item.transferredAt ? <div><dt>Thời điểm chuyển khoản</dt><dd>{withdrawalDate(item.transferredAt)}</dd></div> : null}
    </dl>
    {item.status === 'PROCESSING' ? <p className="withdrawal-notice">Đang xử lý chuyển khoản. Số tiền tiếp tục được giữ cho đến khi xác định kết quả.</p> : null}
    <section className="withdrawal-detail-history"><h3>Lịch sử xử lý</h3>
    {item.events?.length ? <ol className="withdrawal-timeline">{item.events.map(event => <li key={event.id}>
      {event.toStatus in withdrawalLabels ? <WithdrawalStatusBadge status={event.toStatus as Withdrawal['status']} /> : <strong>{event.toStatus}</strong>}
      <time dateTime={event.createdAt}>{withdrawalDate(event.createdAt)}</time><p>{event.reason}</p>
    </li>)}</ol> : <p className="withdrawal-timeline-empty">Chưa có cập nhật xử lý.</p>}</section>
  </div>;
}
