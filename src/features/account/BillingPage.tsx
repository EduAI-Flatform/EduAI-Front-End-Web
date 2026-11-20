import { getAuthSession } from '../../services/auth.service';
﻿import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, Download, FileText, ReceiptText, RotateCcw, XCircle } from 'lucide-react';
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import { ApiClientError } from '../../services/api-client';
import { downloadExcel } from '../../services/excel-download';
import { commerceService, formatCommerceMoney, type CommerceOrderHistoryItem } from '../../services/commerce.service';
import { platformRequestsService, type SupportTicket } from '../../services/platform-requests.service';
import { usePlatform } from '../platform/PlatformProvider';
import './AccountPages.css';
import './BillingPage.css';

const orderStatuses = [
  ['', 'Tất cả', 'All'], ['pending_payment', 'Chờ thanh toán', 'Awaiting payment'],
  ['confirmed', 'Đã thanh toán', 'Paid'], ['cancelled', 'Đã hủy', 'Cancelled'],
  ['expired', 'Đã hết hạn', 'Expired'], ['late_payment_review', 'Cần đối soát', 'Needs reconciliation'],
  ['late_payment_refunded', 'Đã hoàn tiền thanh toán muộn', 'Late payment refunded'],
] as const;
const invoiceStatuses = [
  ['', 'Tất cả', 'All'], ['open', 'Mới gửi', 'Submitted'], ['in_progress', 'Đang xử lý', 'In progress'],
  ['resolved', 'Đã giải quyết', 'Resolved'], ['closed', 'Đã đóng', 'Closed'],
] as const;

export function BillingPage() {
  const { t, locale, settings } = usePlatform();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'invoices' ? 'invoices' : 'orders';
  const statuses = tab === 'orders' ? orderStatuses : invoiceStatuses;
  const status = statuses.some(([value]) => value === params.get('status')) ? params.get('status')! : '';
  const start = params.get('startDate') ?? '', end = params.get('endDate') ?? '';
  const rawPage = Number(params.get('page') ?? '1');
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [orders, setOrders] = useState<CommerceOrderHistoryItem[]>([]);
  const [invoices, setInvoices] = useState<SupportTicket[]>([]);
  const [pages, setPages] = useState(0), [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0), [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CommerceOrderHistoryItem | null>(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false), [exportError, setExportError] = useState('');
  const generation = useRef(0), exportPending = useRef<number | null>(null);
  const invalidDates = Boolean(start && end && start > end);
  const filters = { status, startDate: start, endDate: end };
  function changeFilters(changes: Record<string, string>) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('page');
      Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
      return next;
    });
  }
  useEffect(() => {
    generation.current++; exportPending.current = null; setExporting(false); setExportError(''); setNotice('');
    return () => { generation.current++; exportPending.current = null; };
  }, [tab, status, start, end]);
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setOrders([]); setInvoices([]); setTotal(0);
    if (invalidDates) { setLoading(false); return; }
    const load = tab === 'orders'
      ? commerceService.listOrders(page, 20, filters).then(result => {
        if (active) { setOrders(result.items); setPages(result.totalPages); setTotal(result.total ?? result.items.length); }
      })
      : platformRequestsService.listInvoices(page, filters).then(result => {
        if (active) { setInvoices(result.items); setPages(result.totalPages); setTotal(result.total ?? result.items.length); }
      });
    load.catch(() => { if (active) setError(t('Không tải được dữ liệu thanh toán.', 'Unable to load billing data.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab, page, revision, locale, status, start, end, invalidDates]);

  async function exportReport() {
    if (exportPending.current !== null || loading || !total || invalidDates) return;
    const current = generation.current;
    const owner = getAuthSession()?.user.id;
    exportPending.current = current; setExporting(true); setExportError(''); setNotice('');
    try {
      const result = tab === 'orders' ? await commerceService.exportOrders(filters) : await platformRequestsService.exportInvoices(filters);
      if (generation.current !== current || getAuthSession()?.user.id !== owner) return;
      downloadExcel(result, `gds-${tab}-${new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })}.xlsx`);
      setNotice(t('Đã xuất số bản ghi:', 'Records exported:') + ' ' + result.exported);
    } catch (failure) {
      if (generation.current === current) setExportError(failure instanceof ApiClientError && failure.code?.endsWith('EXPORT_LIMIT_EXCEEDED')
        ? t('Báo cáo vượt giới hạn 2.000 bản ghi. Hãy thu hẹp khoảng ngày hoặc trạng thái.', 'The report exceeds 2,000 records. Narrow the date range or status.')
        : t('Chưa xuất được Excel. Vui lòng thử lại.', 'Unable to export Excel. Please retry.'));
    } finally {
      if (exportPending.current === current) { exportPending.current = null; setExporting(false); }
    }
  }
  async function requestInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || busy) return;
    const form = new FormData(event.currentTarget); setBusy(true); setError('');
    const value = (key: string) => String(form.get(key) ?? '').trim();
    try {
      await platformRequestsService.createInvoice({ orderId: selected.id, recipientName: value('recipientName'), taxCode: value('taxCode'), billingAddress: value('billingAddress'), invoiceEmail: value('invoiceEmail') });
      setSelected(null); setNotice(t('Đã gửi yêu cầu hóa đơn. Theo dõi tại mục Yêu cầu hóa đơn.', 'Invoice requested. Follow it in Invoice requests.')); setRevision(value => value + 1);
    } catch { setError(t('Không gửi được yêu cầu hóa đơn. Vui lòng thử lại.', 'Unable to request an invoice. Please retry.')); }
    finally { setBusy(false); }
  }
  const date = (value: string) => new Date(value).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
  const label = (value: string, invoice = false) => {
    const found = (invoice ? invoiceStatuses : orderStatuses).find(([key]) => key === value.toLowerCase());
    return found ? t(found[1], found[2]) : t('Chưa rõ trạng thái', 'Unknown status');
  };
  return <section className="account-page billing-page container">
    <header className="billing-header"><span className="billing-header__icon"><ReceiptText aria-hidden="true" size={24} /></span><div>
      <h1>{t('Thanh toán', 'Billing')}</h1><p>{t('Quản lý đơn hàng, theo dõi yêu cầu hóa đơn và tải báo cáo của bạn.', 'Manage orders, track invoice requests and download your reports.')}</p>
    </div></header>
    <nav className="account-tabs billing-views" aria-label={t('Nội dung thanh toán', 'Billing views')}>
      <button type="button" disabled={exporting} aria-pressed={tab === 'orders'} onClick={() => changeFilters({ tab: '', status: '' })}><ReceiptText size={18} aria-hidden="true" />{t('Đơn hàng', 'Orders')}</button>
      <button type="button" disabled={exporting} aria-pressed={tab === 'invoices'} onClick={() => changeFilters({ tab: 'invoices', status: '' })}><FileText size={18} aria-hidden="true" />{t('Yêu cầu hóa đơn', 'Invoice requests')}</button>
    </nav>
    <section className="billing-workspace" aria-label={tab === 'orders' ? t('Danh sách đơn hàng', 'Order list') : t('Danh sách yêu cầu hóa đơn', 'Invoice request list')}>
      <nav className="billing-statuses" aria-label={t('Lọc trạng thái', 'Filter by status')}>
        {statuses.map(([value, vi, en]) => <button type="button" key={value} disabled={exporting} aria-pressed={status === value} onClick={() => changeFilters({ status: value })}>{t(vi, en)}</button>)}
      </nav>
      <div className="billing-toolbar">
        <div className="billing-dates"><label>{t('Từ ngày', 'Start date')}<input type="date" value={start} max={end || undefined} disabled={exporting} onChange={event => changeFilters({ startDate: event.target.value })} /></label>
          <label>{t('Đến ngày', 'End date')}<input type="date" value={end} min={start || undefined} disabled={exporting} onChange={event => changeFilters({ endDate: event.target.value })} /></label>
          {(status || start || end) && <Button variant="ghost" disabled={exporting} onClick={() => changeFilters({ status: '', startDate: '', endDate: '' })}><RotateCcw size={16} aria-hidden="true" />{t('Xóa bộ lọc', 'Clear filters')}</Button>}
        </div>
        <div className="billing-export"><Button variant="outline" disabled={loading || exporting || !total || invalidDates || Boolean(error)} onClick={() => void exportReport()}><Download size={18} aria-hidden="true" />{exporting ? t('Đang xuất Excel…', 'Exporting Excel…') : t('Xuất Excel', 'Export Excel')}</Button>
          <small>{!loading && !total ? t('Chưa có dữ liệu để xuất theo bộ lọc này.', 'No records to export for this filter.') : t('Xuất toàn bộ kết quả theo bộ lọc', 'Export all matching records')}</small>
        </div>
      </div>
      {(invalidDates || error || exportError) && <div className="billing-feedback" role="alert">{invalidDates ? t('Ngày bắt đầu không được sau ngày kết thúc.', 'Start date must not follow end date.') : error || exportError}
        {error && <Button variant="outline" onClick={() => setRevision(value => value + 1)}>{t('Thử lại', 'Retry')}</Button>}
      </div>}
      {notice && <p className="billing-feedback" role="status">{notice}</p>}
      {loading ? <div className="billing-empty" role="status"><Clock3 aria-hidden="true" /><p>{t('Đang tải…', 'Loading…')}</p></div> : !error && !invalidDates && <>
        <div className="billing-result-count">{total} {tab === 'orders' ? t('đơn hàng', 'orders') : t('yêu cầu', 'requests')}</div>
        {(tab === 'orders' ? !orders.length : !invoices.length) && <div className="billing-empty"><ReceiptText size={32} aria-hidden="true" /><h2>{tab === 'orders' ? t('Không có đơn hàng phù hợp.', 'No matching orders.') : t('Chưa có yêu cầu hóa đơn.', 'No invoice requests yet.')}</h2><p>{tab === 'orders' ? t('Thử chọn trạng thái hoặc khoảng ngày khác.', 'Try another status or date range.') : t('Bạn có thể gửi yêu cầu từ đơn hàng đã thanh toán.', 'You can request an invoice from a paid order.')}</p></div>}
        <div className="billing-list">{tab === 'orders' ? orders.map(order => <article className="billing-order" key={order.id}>
          <div className="billing-order__top"><span className="billing-order__number">{order.orderNumber}</span><span className={`billing-badge billing-badge--${order.status.toLowerCase()}`}>{order.status === 'CONFIRMED' ? <CheckCircle2 size={15} aria-hidden="true" /> : ['CANCELLED', 'EXPIRED'].includes(order.status) ? <XCircle size={15} aria-hidden="true" /> : <Clock3 size={15} aria-hidden="true" />}{label(order.status)}</span></div>
          <h2>{order.lines.map(line => line.title).join(' · ')}</h2>
          <dl className="billing-order__details"><div><dt>{t('Ngày tạo', 'Created')}</dt><dd>{date(order.createdAt)}</dd></div><div><dt>{t('Thực trả', 'Payable')}</dt><dd className="billing-order__amount">{formatCommerceMoney(order.payable)}</dd></div>{order.confirmedAt && <div><dt>{t('Ngày thanh toán', 'Payment date')}</dt><dd>{date(order.confirmedAt)}</dd></div>}</dl>
          <footer className="billing-order__actions"><Link className="account-button" to={`/billing/orders/${order.id}`}>{t('Chi tiết đơn hàng', 'Order details')}</Link>
            {order.invoiceRequest ? <><span className="billing-invoice-note">{t('Hóa đơn:', 'Invoice:')} {label(order.invoiceRequest.status, true)}</span><Link className="billing-text-link" to="/billing?tab=invoices">{t('Theo dõi yêu cầu', 'Track request')}</Link></> : order.status === 'CONFIRMED' && <Button disabled={!settings.operations.invoiceRequestsEnabled} onClick={() => setSelected(order)}>{t('Yêu cầu xuất hóa đơn', 'Request invoice')}</Button>}
          </footer>
        </article>) : invoices.map(invoice => <article className="billing-order" key={invoice.id}>
          <div className="billing-order__top"><span className="billing-order__number">{invoice.orderNumber ?? invoice.title}</span><span className={`billing-badge billing-badge--${invoice.status}`}>{label(invoice.status, true)}</span></div>
          <h2>{invoice.invoiceDetails?.recipientName ?? invoice.title}</h2>
          <dl className="billing-order__details"><div><dt>{t('Ngày gửi', 'Submitted')}</dt><dd>{date(invoice.createdAt)}</dd></div>{invoice.invoiceDetails?.invoiceEmail && <div><dt>{t('Email nhận hóa đơn', 'Invoice email')}</dt><dd>{invoice.invoiceDetails.invoiceEmail}</dd></div>}</dl>
          <footer className="billing-order__actions"><Link className="account-button" to="/support">{t('Xem trao đổi', 'View conversation')}</Link></footer>
        </article>)}</div>
        {pages > 1 && <nav className="billing-pagination" aria-label={t('Phân trang thanh toán', 'Billing pages')}><Button variant="outline" disabled={page <= 1} onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(page - 1)); return next; })}>{t('Trước', 'Previous')}</Button><span>{page} / {pages}</span><Button variant="outline" disabled={page >= pages} onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(page + 1)); return next; })}>{t('Sau', 'Next')}</Button></nav>}
      </>}
    </section>
    <Modal open={Boolean(selected)} onOpenChange={open => { if (!open && !busy) setSelected(null); }} title={t('Yêu cầu xuất hóa đơn', 'Request invoice')}>
      <form className="account-panel billing-invoice-form" onSubmit={requestInvoice}>
        <p>{selected?.orderNumber}</p>
        {settings.operations.invoiceInstructions[locale] && <p>{settings.operations.invoiceInstructions[locale]}</p>}
        {error && <p role="alert">{error}</p>}
        <label>{t('Tên người nhận / tổ chức', 'Recipient / organization')}<input name="recipientName" required minLength={2} maxLength={180} disabled={busy} /></label>
        <label>{t('Mã số thuế', 'Tax code')}<input name="taxCode" required pattern="[A-Za-z0-9-]{5,30}" maxLength={30} disabled={busy} /></label>
        <label>{t('Địa chỉ xuất hóa đơn', 'Billing address')}<textarea name="billingAddress" required minLength={5} maxLength={500} disabled={busy} /></label>
        <label>{t('Email nhận hóa đơn', 'Invoice email')}<input name="invoiceEmail" type="email" required maxLength={254} disabled={busy} /></label>
        <Button type="submit" disabled={busy}>{busy ? t('Đang gửi…', 'Sending…') : t('Gửi yêu cầu', 'Submit request')}</Button>
      </form>
    </Modal>
  </section>;
}
