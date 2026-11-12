import { SystemValue } from '@/features/platform/SystemText';
import { currentSystemLocale } from "../../platform/translate-system-message";
import { SystemText, useSystemMessages } from '@/features/platform/SystemText';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import {
  adminCommerceService,
  getAdminCommerceErrorMessage,
  type CommerceRefund,
  type CommerceRefundPage,
} from '../../../services/admin-commerce.service';

const PAGE_SIZE = 25;

export function RefundOperations() {
  const messageForUi = useSystemMessages();
  const [page, setPage] = useState<CommerceRefundPage | null>(null);
  const [selected, setSelected] = useState<CommerceRefund | null>(null);
  const [status, setStatus] = useState('requested');
  const [pageNumber, setPageNumber] = useState(1);
  const [externalReference, setExternalReference] = useState('');
  const [rejectionReason, setRejectionReason] = useState('OPERATOR_REJECTED');
  const [confirmed, setConfirmed] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await adminCommerceService.listRefunds({
        page: pageNumber, pageSize: PAGE_SIZE, status: status || undefined,
      });
      if (request !== sequence.current) return;
      setPage(result);
      setSelected((current) => current
        ? result.items.find((item) => item.id === current.id) ?? null
        : null);
    } catch (reason) {
      if (request === sequence.current) setError(getAdminCommerceErrorMessage(reason));
    }
  }, [pageNumber, status]);
  useEffect(() => { void load(); }, [load]);

  async function runExpiry() {
    if (!window.confirm('Kiểm tra các yêu cầu thanh toán đã đến hạn?')) return;
    setWorking(true); setError(null);
    try {
      await adminCommerceService.runPaymentExpiry();
      await load();
    } catch (reason) { setError(getAdminCommerceErrorMessage(reason)); }
    finally { setWorking(false); }
  }

  async function record(event: FormEvent) {
    event.preventDefault();
    if (!selected || !confirmed) return;
    setWorking(true); setError(null);
    try {
      await adminCommerceService.recordRefund(selected.id, {
        externalReference: externalReference.trim(),
        confirmExternalAction: true,
        expectedUpdatedAt: selected.updatedAt,
      });
      setSelected(null); setExternalReference(''); setConfirmed(false);
      await load();
    } catch (reason) { setError(getAdminCommerceErrorMessage(reason)); }
    finally { setWorking(false); }
  }

  async function reject() {
    if (!selected) return;
    if (!window.confirm('Từ chối yêu cầu hoàn tiền với lý do đã nhập?')) return;
    setWorking(true); setError(null);
    try {
      await adminCommerceService.rejectRefund(selected.id, {
        rejectionReasonCode: rejectionReason,
        expectedUpdatedAt: selected.updatedAt,
      });
      setSelected(null);
      await load();
    } catch (reason) { setError(getAdminCommerceErrorMessage(reason)); }
    finally { setWorking(false); }
  }

  return <section aria-labelledby="commerce-refunds-title">
    <div className="admin-commerce-filters">
      <label><span><SystemText message={"Trạng thái"} /></span><select aria-label={messageForUi("Trạng thái hoàn tiền")} value={status} onChange={(event) => { setPageNumber(1); setStatus(event.target.value); }}><option value="requested"><SystemText message={"Đã yêu cầu"} /></option><option value="recorded"><SystemText message={"Đã ghi nhận"} /></option><option value="rejected"><SystemText message={"Đã từ chối"} /></option><option value=""><SystemText message={"Tất cả"} /></option></select></label>
      <p className="admin-commerce-note"><SystemText message={"Ghi nhận kết quả sau khi đã hoàn tiền."} /></p>
      <button disabled={working} onClick={() => void runExpiry()} type="button"><RefreshCw aria-hidden="true" /><SystemText message={"Kiểm tra thanh toán đến hạn"} /></button>
    </div>
    {error ? <p className="admin-commerce-error" role="alert"><AlertTriangle aria-hidden="true" /><SystemText message={error} /></p> : null}
    <div className="admin-commerce-grid admin-commerce-grid--orders">
      <section className="admin-commerce-panel">
        <div className="admin-commerce-panel__heading"><div><RotateCcw aria-hidden="true" /><h2 id="commerce-refunds-title"><SystemText message={"Hoàn tiền thủ công"} /></h2></div><span>{page?.total ?? 0} <SystemText message={"bản ghi"} /></span></div>
        {!page?.items.length ? <p className="admin-commerce-empty"><SystemText message={"Không có bản ghi hoàn tiền phù hợp."} /></p> : null}
        <div className="admin-commerce-list">{page?.items.map((item) =>
          <button className={selected?.id === item.id ? 'admin-commerce-list__item admin-commerce-list__item--active' : 'admin-commerce-list__item'} key={item.id} onClick={() => { setSelected(item); setConfirmed(false); setExternalReference(''); }} type="button">
            <span><strong>{item.order.orderNumber}</strong><small>{item.reasonCode} · <SystemValue render={() => (formatMoney(item.amountMinor, item.currency))} /></small></span><em>{item.status}</em>
          </button>)}</div>
        {page && page.totalPages > 1 ? <nav className="admin-commerce-pagination"><button disabled={page.page <= 1} onClick={() => setPageNumber(page.page - 1)} type="button"><SystemText message={"Trước"} /></button><span><SystemText message={"Trang"} /> {page.page} / {page.totalPages}</span><button disabled={page.page >= page.totalPages} onClick={() => setPageNumber(page.page + 1)} type="button"><SystemText message={"Sau"} /></button></nav> : null}
      </section>
      <section className="admin-commerce-panel admin-commerce-detail" aria-label={messageForUi("Chi tiết hoàn tiền")}>
        {!selected ? <p className="admin-commerce-empty"><SystemText message={"Chọn yêu cầu để xem chi tiết và lịch sử hoàn tiền."} /></p> :
          <div className="admin-commerce-detail__content">
            <h2>{selected.order.orderNumber}</h2>
            <dl className="admin-commerce-facts"><div><dt><SystemText message={"Trạng thái"} /></dt><dd>{selected.status}</dd></div><div><dt><SystemText message={"Số tiền"} /></dt><dd><SystemValue render={() => (formatMoney(selected.amountMinor, selected.currency))} /></dd></div><div><dt><SystemText message={"Lý do"} /></dt><dd>{selected.reasonCode}</dd></div><div><dt><SystemText message={"Người yêu cầu"} /></dt><dd>{selected.requestedBy.fullName}</dd></div><div><dt><SystemText message={"Mã tham chiếu bên ngoài"} /></dt><dd>{selected.externalReference ?? <SystemText message={"Chưa ghi nhận"} />}</dd></div><div><dt><SystemText message={"Người ghi nhận"} /></dt><dd>{selected.recordedBy?.fullName ?? <SystemText message={"Chưa ghi nhận"} />}</dd></div><div><dt><SystemText message={"Thời điểm ghi nhận"} /></dt><dd><SystemValue render={() => (selected.recordedAt ? formatDate(selected.recordedAt) : 'Not recorded')} /></dd></div><div><dt><SystemText message={"Từ chối"} /></dt><dd>{selected.rejectionReasonCode ?? <SystemText message={"Chưa bị từ chối"} />}</dd></div></dl>
            <div className="admin-commerce-detail__lines">{selected.allocations.map((item) => <article key={item.orderLineId}><strong>{item.displayTitle}</strong><span><SystemValue render={() => (formatMoney(item.amountMinor, item.currency))} /></span><small>{item.productType}</small></article>)}</div>
            {selected.status === 'REQUESTED' ? <form className="admin-commerce-form" onSubmit={record}>
              <label><span><SystemText message={"Mã tham chiếu hoàn tiền bên ngoài"} /></span><input required minLength={3} maxLength={128} pattern="[A-Za-z0-9._:/-]+" value={externalReference} onChange={(event) => setExternalReference(event.target.value)} /></label>
              <label className="admin-commerce-toggle"><input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" /><span><SystemText message={"Tôi xác nhận việc hoàn tiền bên ngoài đã hoàn tất."} /></span></label>
              <button disabled={working || !confirmed} type="submit"><SystemText message={"Ghi nhận hoàn tiền bên ngoài"} /></button>
              <label><span><SystemText message={"Lý do từ chối"} /></span><input pattern="[A-Z][A-Z0-9_]{2,79}" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value.toUpperCase())} /></label>
              <button disabled={working} onClick={() => void reject()} type="button"><SystemText message={"Từ chối yêu cầu"} /></button>
            </form> : null}
          </div>}
      </section>
    </div>
  </section>;
}

function formatMoney(value: string, currency: string) {
  try { return `${BigInt(value).toLocaleString(currentSystemLocale())} ${currency}`; }
  catch { return `${value} ${currency}`; }
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(currentSystemLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
