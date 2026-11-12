import { SystemText } from '@/features/platform/SystemText';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../components/ui/modal';
import { platformRequestsService, type PartnerApplication, type PartnerCategory, type PartnerStatus, type RequestPage } from '../../services/platform-requests.service';
import { usePlatform } from '../platform/PlatformProvider';
import { RequestPagination, SupportPage } from './SupportPage';
import './Requests.css';

const categories: Record<PartnerCategory, [string, string]> = { school: ['Đối tác trường học', 'School partner'], business: ['Đối tác doanh nghiệp', 'Business partner'], scholarship: ['Quỹ khuyến học', 'Scholarship fund'], digital: ['Dịch vụ số', 'Digital services'] };
const statuses: Record<PartnerStatus, [string, string]> = { submitted: ['Đã gửi', 'Submitted'], reviewing: ['Đang xem xét', 'Reviewing'], contacted: ['Đã liên hệ', 'Contacted'], accepted: ['Đã chấp thuận', 'Accepted'], rejected: ['Không chấp thuận', 'Rejected'] };

export function PartnerApplicationPage() {
  const { t, settings } = usePlatform();
  return <section className="gds-requests gds-requests--public container">
    <header><h1>{t('Liên kết với GDS', 'Partner with GDS')}</h1><p>{t('Kết nối trường học, doanh nghiệp, quỹ khuyến học và dịch vụ số.', 'Connect schools, businesses, scholarship funds and digital services.')}</p></header>
    {settings.partners.items.length > 0 && <div className="gds-requests__partners">{settings.partners.items.map((partner, index) => <a key={`${partner.name}-${index}`} href={partner.url} target="_blank" rel="noopener noreferrer"><img src={partner.logoUrl} alt={partner.name} loading="lazy" /><span>{partner.name}</span></a>)}</div>}
    <PartnerApplicationForm />
  </section>;
}

export function PartnerApplicationForm() {
  const { t, settings } = usePlatform();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [reference, setReference] = useState('');
  const enabled = settings.operations.partnerApplicationsEnabled;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!enabled || busy) return;
    const form = event.currentTarget; const data = new FormData(form); setBusy(true); setError('');
    const text = (key: string) => String(data.get(key) ?? '').trim();
    try {
      const result = await platformRequestsService.createPartner({ category: text('category') as PartnerCategory, name: text('name'), organization: text('organization'), phone: text('phone'), email: text('email'), content: text('content'), consent: data.get('consent') === 'on' });
      setReference(result.id); form.reset();
    } catch { setError(t('Không gửi được đăng ký. Thông tin đã nhập được giữ lại để bạn thử lại.', 'Unable to submit your application. Your input is preserved so you can retry.')); }
    finally { setBusy(false); }
  }
  return <section className="gds-requests__panel">
    <h2>{t('Đăng ký hợp tác', 'Partnership application')}</h2>
    {!enabled && <p role="status" className="gds-requests__notice">{t('Đăng ký đối tác chưa được mở. Vui lòng quay lại sau.', 'Partner applications are not open yet. Please check back later.')}</p>}
    {reference && <p role="status">{t('Đã tiếp nhận đăng ký. Mã tham chiếu:', 'Application received. Reference:')} <strong>{reference}</strong></p>}
    {error && <p role="alert" className="gds-requests__error"><SystemText message={error} /></p>}
    <form onSubmit={submit}><fieldset disabled={busy || !enabled} className="gds-requests__form-grid">
      <label>{t('Hình thức hợp tác', 'Partner category')}<select name="category" required>{Object.entries(categories).map(([key, value]) => <option key={key} value={key}>{t(...value)}</option>)}</select></label>
      <label>{t('Họ tên', 'Full name')}<input name="name" autoComplete="name" minLength={2} maxLength={120} required /></label>
      <label>{t('Tổ chức', 'Organization')}<input name="organization" autoComplete="organization" minLength={2} maxLength={180} required /></label>
      <label>{t('Số điện thoại liên hệ', 'Contact phone')}<input name="phone" type="tel" autoComplete="tel" pattern="[+()0-9 .\-]{7,30}" maxLength={30} required /></label>
      <label>{t('Email', 'Email')}<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label className="gds-requests__full">{t('Nội dung', 'Message')}<textarea name="content" minLength={10} maxLength={10000} rows={6} required /></label>
      <label className="gds-requests__consent gds-requests__full"><input name="consent" type="checkbox" required /><span>{t('Tôi đồng ý để GDS sử dụng thông tin này để liên hệ về đăng ký hợp tác.', 'I agree that GDS may use this information to contact me about this application.')} <Link to="/privacy">{t('Chính sách bảo mật', 'Privacy policy')}</Link></span></label>
      <button type="submit" className="gds-requests__primary">{busy ? t('Đang gửi…', 'Submitting…') : t('Gửi đăng ký', 'Submit application')}</button>
    </fieldset></form>
  </section>;
}

export function AdminRequestsPage() {
  const { t } = usePlatform(); const [view, setView] = useState<'support' | 'partners'>('support');
  return <div className="gds-requests"><div className="gds-requests__toolbar" aria-label={t('Loại yêu cầu', 'Request category')}>
    <button type="button" aria-pressed={view === 'support'} onClick={() => setView('support')}>{t('Hỗ trợ', 'Support')}</button><button type="button" aria-pressed={view === 'partners'} onClick={() => setView('partners')}>{t('Đăng ký đối tác', 'Partner applications')}</button>
  </div>{view === 'support' ? <SupportPage admin /> : <AdminPartnerApplications />}</div>;
}

function AdminPartnerApplications() {
  const { t, locale } = usePlatform(); const [page, setPage] = useState(1); const [filter, setFilter] = useState<PartnerStatus | ''>('');
  const [result, setResult] = useState<RequestPage<PartnerApplication> | null>(null); const [selected, setSelected] = useState<PartnerApplication | null>(null);
  const [status, setStatus] = useState<PartnerStatus>('submitted'); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    platformRequestsService.listPartners(page, filter).then(value => { if (active) setResult(value); })
      .catch(() => { if (active) setError(t('Không tải được đăng ký đối tác.', 'Unable to load partner applications.')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, filter, revision, locale]);
  async function update() {
    if (!selected || busy) return; setBusy(true); setError('');
    try { const value = await platformRequestsService.updatePartner(selected.id, status); setSelected(value); setRevision(value => value + 1); }
    catch { setError(t('Không cập nhật được trạng thái.', 'Unable to update status.')); }
    finally { setBusy(false); }
  }
  return <section className="gds-requests"><h1>{t('Đăng ký đối tác', 'Partner applications')}</h1>
    <div className="gds-requests__toolbar"><label>{t('Trạng thái', 'Status')}<select value={filter} onChange={event => { setFilter(event.target.value as PartnerStatus | ''); setPage(1); }}><option value="">{t('Tất cả', 'All')}</option>{Object.entries(statuses).map(([key, value]) => <option key={key} value={key}>{t(...value)}</option>)}</select></label><button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)}>{t('Tải lại', 'Reload')}</button></div>
    {error && <p role="alert" className="gds-requests__error"><SystemText message={error} /></p>}
    {loading ? <p role="status">{t('Đang tải…', 'Loading…')}</p> : !result?.items.length ? <div className="gds-requests__empty">{t('Chưa có đăng ký.', 'No applications found.')}</div> : <>
      <table className="gds-requests__table"><caption className="sr-only">{t('Danh sách đăng ký đối tác', 'Partner application list')}</caption><thead><tr><th>{t('Tổ chức', 'Organization')}</th><th>{t('Hình thức', 'Category')}</th><th>{t('Trạng thái', 'Status')}</th><th>{t('Ngày tạo', 'Created at')}</th><th>{t('Thao tác', 'Actions')}</th></tr></thead><tbody>{result.items.map(item => <tr key={item.id}>
        <td data-label={t('Tổ chức', 'Organization')}>{item.organization}</td><td data-label={t('Hình thức', 'Category')}>{t(...categories[item.category])}</td><td data-label={t('Trạng thái', 'Status')}>{t(...statuses[item.status])}</td><td data-label={t('Ngày tạo', 'Created at')}>{new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium' }).format(new Date(item.createdAt))}</td><td><button type="button" aria-label={`${t('Xem đăng ký', 'View application')}: ${item.organization}`} onClick={() => { setSelected(item); setStatus(item.status); }}>{t('Chi tiết', 'View')}</button></td>
      </tr>)}</tbody></table><RequestPagination page={page} totalPages={result.totalPages} onChange={setPage} /></>}
    <Modal open={Boolean(selected)} onOpenChange={open => { if (!open && !busy) setSelected(null); }} title={t('Thông tin đăng ký', 'Application details')} description={t('Chỉ sử dụng thông tin này để xử lý đăng ký hợp tác.', 'Use this information only to process the partnership application.')}>
      {selected && <div className="gds-requests">{error && <p role="alert" className="gds-requests__error"><SystemText message={error} /></p>}
        <dl className="gds-requests__contact"><dt>{t('Họ tên', 'Name')}</dt><dd>{selected.name}</dd><dt>{t('Tổ chức', 'Organization')}</dt><dd>{selected.organization}</dd><dt>{t('Điện thoại', 'Phone')}</dt><dd>{selected.phone}</dd><dt>Email</dt><dd>{selected.email}</dd></dl>
        <p className="gds-requests__body">{selected.content}</p><label>{t('Trạng thái', 'Status')}<select value={status} onChange={event => setStatus(event.target.value as PartnerStatus)} disabled={busy}>{Object.entries(statuses).map(([key, value]) => <option key={key} value={key}>{t(...value)}</option>)}</select></label><button type="button" className="gds-requests__primary" onClick={() => void update()} disabled={busy || selected.status === status}>{t('Lưu trạng thái', 'Save status')}</button>
      </div>}
    </Modal>
  </section>;
}
