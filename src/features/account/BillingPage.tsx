import { SystemValue } from '@/features/platform/SystemText';
import { SystemText } from '@/features/platform/SystemText';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../components/ui/modal';
import { commerceService, formatCommerceMoney, type CommerceOrderHistoryItem } from '../../services/commerce.service';
import { platformRequestsService, type SupportTicket } from '../../services/platform-requests.service';
import { usePlatform } from '../platform/PlatformProvider';
import { supportLabels } from '../requests/SupportPage';
import './AccountPages.css';

export function BillingPage() {
  const { t, locale, settings } = usePlatform();
  const [tab, setTab] = useState<'orders' | 'invoices'>('orders');
  const [orders, setOrders] = useState<CommerceOrderHistoryItem[]>([]);
  const [invoices, setInvoices] = useState<SupportTicket[]>([]);
  const [page, setPage] = useState(1), [pages, setPages] = useState(0);
  const [status, setStatus] = useState(''), [start, setStart] = useState(''), [end, setEnd] = useState('');
  const [revision, setRevision] = useState(0), [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CommerceOrderHistoryItem | null>(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const load = tab === 'orders'
      ? commerceService.listOrders(page, 20, { status: status === 'paid' ? 'confirmed' : status === 'pending' ? 'pending_payment' : '', startDate: start, endDate: end }).then(result => { if (active) { setOrders(result.items); setPages(result.totalPages); } })
      : platformRequestsService.listInvoices(page).then(result => { if (active) { setInvoices(result.items); setPages(result.totalPages); } });
    load.catch(() => { if (active) setError(t('Không tải được dữ liệu thanh toán.', 'Unable to load billing data.')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab, page, revision, locale, status, start, end]);
  const visibleOrders = orders;
  async function requestInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || busy) return;
    const form = new FormData(event.currentTarget); setBusy(true); setError('');
    const value = (key: string) => String(form.get(key) ?? '').trim();
    try {
      await platformRequestsService.createInvoice({ orderId: selected.id, recipientName: value('recipientName'), taxCode: value('taxCode'), billingAddress: value('billingAddress'), invoiceEmail: value('invoiceEmail') });
      setSelected(null); setNotice(t('Đã gửi yêu cầu hóa đơn. Theo dõi và trao đổi tại mục Hỗ trợ.', 'Invoice requested. Follow updates and replies in Support.')); setRevision(value => value + 1);
    } catch { setError(t('Không gửi được yêu cầu hóa đơn. Vui lòng thử lại.', 'Unable to request an invoice. Please retry.')); }
    finally { setBusy(false); }
  }
  return <section className="account-page container"><header><h1><SystemText message={"Thanh toán"} /></h1></header>
    <nav className="account-tabs" aria-label={t('Nội dung thanh toán', 'Billing views')}><button aria-pressed={tab === 'orders'} onClick={() => { setTab('orders'); setPage(1); }}>{t('Đơn hàng', 'Orders')}</button><button aria-pressed={tab === 'invoices'} onClick={() => { setTab('invoices'); setPage(1); }}>{t('Xuất hóa đơn', 'Invoice requests')}</button></nav>
    {notice && <p role="status"><SystemText message={notice} /> <Link to="/support">{t('Hỗ trợ', 'Support')}</Link></p>}
    {error && <p role="alert"><SystemText message={error} /><button onClick={() => setRevision(value => value + 1)}>{t('Thử lại', 'Retry')}</button></p>}
    {loading ? <p role="status">{t('Đang tải…', 'Loading…')}</p> : <section className="account-panel">
      {tab === 'orders' ? <>
        <div className="account-filters"><label>{t('Trạng thái', 'Status')}<select value={status} onChange={event => setStatus(event.target.value)}><option value="">{t('Tất cả', 'All')}</option><option value="paid">{t('Đã thanh toán', 'Paid')}</option><option value="pending">{t('Chưa thanh toán', 'Unpaid')}</option></select></label><label>{t('Từ ngày', 'Start date')}<input type="date" value={start} max={end || undefined} onChange={event => setStart(event.target.value)} /></label><label>{t('Đến ngày', 'End date')}<input type="date" value={end} min={start || undefined} onChange={event => setEnd(event.target.value)} /></label></div>
        {!visibleOrders.length && <p>{t('Không có đơn hàng phù hợp.', 'No matching orders.')}</p>}
        {visibleOrders.map(order => <article className="account-order" key={order.id}><h2>{order.orderNumber}</h2><h3>{order.lines[0]?.title}</h3><dl><div><dt>{t('Ngày mua', 'Purchase date')}</dt><dd><SystemValue render={() => (new Date(order.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US'))} /></dd></div><div><dt>{t('Tổng tiền', 'Amount')}</dt><dd><SystemValue render={() => (formatCommerceMoney(order.payable))} /></dd></div><div><dt>{t('Trạng thái', 'Status')}</dt><dd>{order.status === 'CONFIRMED' ? t('Đã thanh toán', 'Paid') : order.status === 'PENDING_PAYMENT' ? t('Chưa thanh toán', 'Unpaid') : order.status}</dd></div></dl><Link to={`/billing/orders/${order.id}`}>{t('Chi tiết đơn hàng', 'Order details')}</Link>{order.status === 'CONFIRMED' && <button disabled={!settings.operations.invoiceRequestsEnabled} onClick={() => setSelected(order)}>{t('Yêu cầu xuất hóa đơn', 'Request invoice')}</button>}</article>)}
      </> : <>
        {!invoices.length && <p>{t('Chưa có yêu cầu hóa đơn.', 'No invoice requests yet.')}</p>}
        {invoices.map(invoice => <article className="account-order" key={invoice.id}><h2>{invoice.title}</h2><p>{t(...supportLabels[invoice.status])}</p><p><SystemValue render={() => (new Date(invoice.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US'))} /></p><Link to="/support">{t('Xem trao đổi', 'View conversation')}</Link></article>)}
      </>}
      {pages > 1 && <nav className="account-tabs" aria-label={t('Phân trang thanh toán', 'Billing pages')}><button disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('Trước', 'Previous')}</button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)}>{t('Sau', 'Next')}</button></nav>}
    </section>}
    <Modal open={Boolean(selected)} onOpenChange={open => { if (!open && !busy) setSelected(null); }} title={t('Yêu cầu xuất hóa đơn', 'Request invoice')}>
      <form className="account-panel" onSubmit={requestInvoice}>
        <p>{selected?.orderNumber}</p>
        {settings.operations.invoiceInstructions[locale] && <p>{settings.operations.invoiceInstructions[locale]}</p>}
        <label>{t('Tên người nhận / tổ chức', 'Recipient / organization')}<input name="recipientName" required minLength={2} maxLength={180} disabled={busy} /></label>
        <label>{t('Mã số thuế', 'Tax code')}<input name="taxCode" required pattern="[A-Za-z0-9-]{5,30}" maxLength={30} disabled={busy} /></label>
        <label>{t('Địa chỉ xuất hóa đơn', 'Billing address')}<textarea name="billingAddress" required minLength={5} maxLength={500} disabled={busy} /></label>
        <label>{t('Email nhận hóa đơn', 'Invoice email')}<input name="invoiceEmail" type="email" required maxLength={254} disabled={busy} /></label>
        <button type="submit" disabled={busy}>{busy ? t('Đang gửi…', 'Sending…') : t('Gửi yêu cầu', 'Submit request')}</button>
      </form>
    </Modal>
  </section>;
}
