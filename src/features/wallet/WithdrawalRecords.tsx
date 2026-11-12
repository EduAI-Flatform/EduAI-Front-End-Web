import { SystemValue } from '@/features/platform/SystemText';
import { SystemText, useSystemMessages } from "../platform/SystemText";
import { formatGdsVnd } from '../../services/gds-wallet.service';
import { withdrawalDate, withdrawalLabels, type Withdrawal, type WithdrawalPage } from '../../services/gds-withdrawal.service';
import { Button } from '../../components/ui/button';
import { BankLogo } from './BankPicker';
import { WithdrawalStatusBadge } from './WithdrawalStatusBadge';

export function WithdrawalRecords({ data, loading, page, onPage, onSelect }: {
  data: WithdrawalPage | null; loading: boolean; page: number;
  onPage: (page: number) => void; onSelect: (id: string) => void;
}) {
  const messageForUi = useSystemMessages();
  return <div aria-busy={loading}>
    {loading ? <p role="status"><SystemText message={"Đang tải yêu cầu rút tiền…"} /></p> : !data?.items.length ? <p><SystemText message={"Chưa có yêu cầu rút tiền."} /></p> :
      <ul className="withdrawal-records">{data.items.map(item => <li key={item.id}>
        <div><strong><SystemValue render={() => (formatGdsVnd(item.amountMinor))} /></strong><WithdrawalStatusBadge status={item.status} /></div>
        <div><span>{item.bankCode} · {item.accountNumber.replace(/.(?=.{4})/g, '•')}</span><time dateTime={item.createdAt}>{withdrawalDate(item.createdAt)}</time></div>
        <small className="withdrawal-record-reference"><SystemText message={"Mã yêu cầu ·"} /> {item.id}</small>
        <Button type="button" variant="outline" onClick={() => onSelect(item.id)}><SystemText message="Xem chi tiết" /></Button>
      </li>)}</ul>}
    {data && data.totalPages > 1 ? <nav className="withdrawal-actions" aria-label={messageForUi("Phân trang yêu cầu rút tiền")}>
      <Button type="button" variant="outline" disabled={loading || page <= 1} onClick={() => onPage(page - 1)}><SystemText message={"Trang trước"} /></Button>
      <span><SystemText message={"Trang"} /> {page}/{data.totalPages}</span>
      <Button type="button" variant="outline" disabled={loading || page >= data.totalPages} onClick={() => onPage(page + 1)}><SystemText message={"Trang sau"} /></Button>
    </nav> : null}
  </div>;
}

export function WithdrawalSummary({ item }: { item: Withdrawal }) {
  return <div className="withdrawal-detail-summary"><div><span><SystemText message={"Số tiền rút"} /></span><strong><SystemValue render={() => (formatGdsVnd(item.amountMinor))} /></strong></div><WithdrawalStatusBadge status={item.status} /></div>;
}
export function WithdrawalInformation({ item, hideRecipient = false, hideSummary = false }: { item: Withdrawal; hideRecipient?: boolean; hideSummary?: boolean }) {
  const messageForUi = useSystemMessages();
  const visibleEvents = item.events?.filter((event, index, events) => !(event.toStatus === 'APPROVED' && events[index + 1]?.toStatus === 'PROCESSING' && events[index + 1]?.actorId === event.actorId));
  return <div className="withdrawal-information">
    {!hideSummary ? <WithdrawalSummary item={item} /> : null}
    {!hideRecipient ? <section className="withdrawal-detail-recipient" aria-label={messageForUi("Tài khoản nhận tiền")}><div className="withdrawal-detail-bank"><BankLogo code={item.bankCode} /><div><span><SystemText message={"Ngân hàng nhận"} /></span><strong>{item.bankShortName ?? item.bankName ?? item.bankCode}</strong></div></div><dl><div><dt><SystemText message="Số tài khoản" /></dt><dd className="withdrawal-detail-account">{item.accountNumber}</dd></div><div><dt><SystemText message="Chủ tài khoản" /></dt><dd>{item.accountHolder}</dd></div></dl></section> : null}
    <dl className="withdrawal-detail-metadata">
      <div><dt><SystemText message={"Mã yêu cầu"} /></dt><dd>{item.id}</dd></div>
      <div><dt><SystemText message={"Ngày gửi"} /></dt><dd>{withdrawalDate(item.createdAt)}</dd></div>
      {item.bankTransactionRef ? <div><dt><SystemText message={"Mã giao dịch ngân hàng"} /></dt><dd>{item.bankTransactionRef}</dd></div> : null}
      {item.transferredAt ? <div><dt><SystemText message={"Thời điểm chuyển khoản"} /></dt><dd>{withdrawalDate(item.transferredAt)}</dd></div> : null}
    </dl>
    {item.status === 'APPROVED' || item.status === 'PROCESSING' ? <p className="withdrawal-notice"><SystemText message={"Đã duyệt, đang chờ chuyển khoản. Số tiền tiếp tục được giữ cho đến khi xác nhận kết quả."} /></p> : null}
    <section className="withdrawal-detail-history"><h3><SystemText message={"Lịch sử xử lý"} /></h3>
    {visibleEvents?.length ? <ol className="withdrawal-timeline">{visibleEvents.map(event => <li key={event.id}>
      {event.toStatus in withdrawalLabels ? <WithdrawalStatusBadge status={event.toStatus as Withdrawal['status']} /> : <strong>{event.toStatus}</strong>}
      <time dateTime={event.createdAt}>{withdrawalDate(event.createdAt)}</time><p>{event.reason}</p>
    </li>)}</ol> : <p className="withdrawal-timeline-empty"><SystemText message={"Chưa có cập nhật xử lý."} /></p>}</section>
  </div>;
}
