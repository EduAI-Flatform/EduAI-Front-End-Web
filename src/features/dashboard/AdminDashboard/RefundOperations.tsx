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
    if (!window.confirm('Run a bounded provider-authoritative expiry check for due payment requests?')) return;
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
    if (!window.confirm('Reject this manual refund request with the entered reason?')) return;
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
      <label><span>Status</span><select aria-label="Refund status" value={status} onChange={(event) => { setPageNumber(1); setStatus(event.target.value); }}><option value="requested">Requested</option><option value="recorded">Recorded</option><option value="rejected">Rejected</option><option value="">All</option></select></label>
      <p className="admin-commerce-note">Recording confirms an external action already completed by an authorized operator. EduAI never initiates payout.</p>
      <button disabled={working} onClick={() => void runExpiry()} type="button"><RefreshCw aria-hidden="true" />Run bounded expiry</button>
    </div>
    {error ? <p className="admin-commerce-error" role="alert"><AlertTriangle aria-hidden="true" />{error}</p> : null}
    <div className="admin-commerce-grid admin-commerce-grid--orders">
      <section className="admin-commerce-panel">
        <div className="admin-commerce-panel__heading"><div><RotateCcw aria-hidden="true" /><h2 id="commerce-refunds-title">Manual refunds</h2></div><span>{page?.total ?? 0} records</span></div>
        {!page?.items.length ? <p className="admin-commerce-empty">No matching refund records.</p> : null}
        <div className="admin-commerce-list">{page?.items.map((item) =>
          <button className={selected?.id === item.id ? 'admin-commerce-list__item admin-commerce-list__item--active' : 'admin-commerce-list__item'} key={item.id} onClick={() => { setSelected(item); setConfirmed(false); setExternalReference(''); }} type="button">
            <span><strong>{item.order.orderNumber}</strong><small>{item.reasonCode} · {formatMoney(item.amountMinor, item.currency)}</small></span><em>{item.status}</em>
          </button>)}</div>
        {page && page.totalPages > 1 ? <nav className="admin-commerce-pagination"><button disabled={page.page <= 1} onClick={() => setPageNumber(page.page - 1)} type="button">Previous</button><span>Page {page.page} / {page.totalPages}</span><button disabled={page.page >= page.totalPages} onClick={() => setPageNumber(page.page + 1)} type="button">Next</button></nav> : null}
      </section>
      <section className="admin-commerce-panel admin-commerce-detail" aria-label="Refund detail">
        {!selected ? <p className="admin-commerce-empty">Select a refund to inspect immutable history.</p> :
          <div className="admin-commerce-detail__content">
            <h2>{selected.order.orderNumber}</h2>
            <dl className="admin-commerce-facts"><div><dt>Status</dt><dd>{selected.status}</dd></div><div><dt>Amount</dt><dd>{formatMoney(selected.amountMinor, selected.currency)}</dd></div><div><dt>Reason</dt><dd>{selected.reasonCode}</dd></div><div><dt>Requested by</dt><dd>{selected.requestedBy.fullName}</dd></div><div><dt>External reference</dt><dd>{selected.externalReference ?? 'Not recorded'}</dd></div><div><dt>Recorded by</dt><dd>{selected.recordedBy?.fullName ?? 'Not recorded'}</dd></div><div><dt>Recorded at</dt><dd>{selected.recordedAt ? formatDate(selected.recordedAt) : 'Not recorded'}</dd></div><div><dt>Rejection</dt><dd>{selected.rejectionReasonCode ?? 'Not rejected'}</dd></div></dl>
            <div className="admin-commerce-detail__lines">{selected.allocations.map((item) => <article key={item.orderLineId}><strong>{item.displayTitle}</strong><span>{formatMoney(item.amountMinor, item.currency)}</span><small>{item.productType}</small></article>)}</div>
            {selected.status === 'REQUESTED' ? <form className="admin-commerce-form" onSubmit={record}>
              <label><span>External refund reference</span><input required minLength={3} maxLength={128} pattern="[A-Za-z0-9._:/-]+" value={externalReference} onChange={(event) => setExternalReference(event.target.value)} /></label>
              <label className="admin-commerce-toggle"><input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" /><span>I confirm the external refund action is complete.</span></label>
              <button disabled={working || !confirmed} type="submit">Record external refund</button>
              <label><span>Rejection reason</span><input pattern="[A-Z][A-Z0-9_]{2,79}" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value.toUpperCase())} /></label>
              <button disabled={working} onClick={() => void reject()} type="button">Reject request</button>
            </form> : null}
            <p className="admin-commerce-note">Original payment, settlement, allocation, learning history, certificates, and audit records remain immutable.</p>
          </div>}
      </section>
    </div>
  </section>;
}

function formatMoney(value: string, currency: string) {
  try { return `${BigInt(value).toLocaleString('vi-VN')} ${currency}`; }
  catch { return `${value} ${currency}`; }
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
