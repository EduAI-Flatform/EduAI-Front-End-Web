import { SystemText } from '@/features/platform/SystemText';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Modal } from '../../components/ui/modal';
import { platformRequestsService, type RequestPage, type SupportDetail, type SupportStatus, type SupportTicket } from '../../services/platform-requests.service';
import { usePlatform } from '../platform/PlatformProvider';
import './Requests.css';
import './SupportImage.css';

export const supportLabels: Record<SupportStatus, [string, string]> = {
  open: ['Mới tiếp nhận', 'Open'], in_progress: ['Đang xử lý', 'In progress'], resolved: ['Đã giải quyết', 'Resolved'], closed: ['Đã đóng', 'Closed'],
};

export function SupportPage({ admin = false }: { admin?: boolean }) {
  const { t, locale, settings } = usePlatform();
  const enabled = settings.operations.supportEnabled;
  const [result, setResult] = useState<RequestPage<SupportTicket> | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SupportStatus | ''>('');
  const [requestType, setRequestType] = useState<'' | 'support' | 'invoice'>('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const reload = () => setRevision(value => value + 1);

  useEffect(() => {
    let active = true; setLoading(true); setError('');
    platformRequestsService.listSupport(admin, page, status, requestType).then(value => { if (active) setResult(value); })
      .catch(() => { if (active) setError(t('Không tải được yêu cầu. Vui lòng thử lại.', 'Unable to load requests. Please retry.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admin, page, status, requestType, revision, locale]);

  return <section className="gds-requests">
    <header className="gds-requests__heading"><div><h1>{t('Hỗ trợ', 'Support')}</h1>
      <p>{admin ? t('Tiếp nhận, phản hồi và xử lý yêu cầu.', 'Review, reply to and resolve requests.') : t('Theo dõi và trao đổi về các yêu cầu của bạn.', 'Track and discuss your support requests.')}</p></div>
      {!admin && <button className="gds-requests__primary" disabled={!enabled} onClick={() => setCreateOpen(true)} type="button">{t('Tạo yêu cầu', 'New request')}</button>}
    </header>
    {!enabled && <p role="status" className="gds-requests__notice">{t('Tiếp nhận và phản hồi mới đang tạm dừng. Bạn vẫn có thể xem yêu cầu đã gửi.', 'New requests and replies are paused. Existing requests remain available.')}</p>}
    {!admin && <p className="gds-requests__muted">{t('Chỉ tài khoản của bạn và quản trị viên được xem nội dung yêu cầu.', 'Only your account and authorized administrators can view your requests.')}</p>}
    <div className="gds-requests__toolbar"><label>{t('Loại yêu cầu', 'Request type')}<select value={requestType} onChange={event => { setRequestType(event.target.value as '' | 'support' | 'invoice'); setPage(1); }}><option value="">{t('Tất cả', 'All')}</option><option value="support">{t('Hỗ trợ', 'Support')}</option><option value="invoice">{t('Hóa đơn', 'Invoice')}</option></select></label><label>{t('Trạng thái', 'Status')}
      <select value={status} onChange={event => { setStatus(event.target.value as SupportStatus | ''); setPage(1); }}>
        <option value="">{t('Tất cả', 'All')}</option>{Object.entries(supportLabels).map(([key, value]) => <option key={key} value={key}>{t(...value)}</option>)}
      </select></label><button type="button" onClick={reload} disabled={loading}>{t('Tải lại', 'Reload')}</button></div>
    {error && <p role="alert" className="gds-requests__error"><SystemText message={error} /></p>}
    {loading ? <p role="status">{t('Đang tải yêu cầu…', 'Loading requests…')}</p> : !error && (!result?.items.length ? <div className="gds-requests__empty">{t('Bạn chưa có yêu cầu nào.', 'No requests found.')}</div> : <>
      <table className="gds-requests__table"><caption className="sr-only">{t('Danh sách yêu cầu hỗ trợ', 'Support request list')}</caption>
        <thead><tr><th>{t('Tiêu đề', 'Title')}</th><th>{t('Nội dung', 'Content')}</th><th>{t('Trạng thái', 'Status')}</th><th>{t('Ngày tạo', 'Created at')}</th><th>{t('Thao tác', 'Actions')}</th></tr></thead>
        <tbody>{result.items.map(item => <tr key={item.id}>
          <td data-label={t('Tiêu đề', 'Title')}><strong>{item.title}</strong></td><td data-label={t('Nội dung', 'Content')}>{item.content}</td>
          <td data-label={t('Trạng thái', 'Status')}><span className={`gds-requests__badge gds-requests__badge--${item.status}`}>{t(...supportLabels[item.status])}</span></td>
          <td data-label={t('Ngày tạo', 'Created at')}>{new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium' }).format(new Date(item.createdAt))}</td>
          <td><button type="button" onClick={() => setSelected(item.id)} aria-label={`${t('Xem yêu cầu', 'View request')}: ${item.title}`}>{t('Chi tiết', 'View')}</button></td>
        </tr>)}</tbody>
      </table>
      <RequestPagination page={page} totalPages={result.totalPages} onChange={setPage} />
    </>)}
    <CreateSupportDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setPage(1); reload(); }} enabled={enabled} />
    <Modal open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }} title={t('Chi tiết yêu cầu', 'Request details')} description={t('Nội dung trao đổi riêng tư với bộ phận hỗ trợ.', 'A private conversation with support.')} className="gds-requests-modal">
      {selected && <SupportConversation id={selected} admin={admin} enabled={enabled} onChanged={reload} />}
    </Modal>
  </section>;
}

function CreateSupportDialog({ open, onClose, onCreated, enabled }: { open: boolean; onClose: () => void; onCreated: () => void; enabled: boolean }) {
  const { t, settings } = usePlatform();
  const imageInput = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | undefined>(); const [preview, setPreview] = useState('');
  const maxMb = settings.operations.maxAttachmentMb ?? 5;
  useEffect(() => {
    if (!image || !open) { setPreview(''); return; }
    const url = URL.createObjectURL(image); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image, open]);
  const [title, setTitle] = useState(''); const [content, setContent] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!enabled || busy) return; setBusy(true); setError('');
    try { await platformRequestsService.createSupport({ title: title.trim(), content: content.trim() }, ...(image ? [image] : [])); setTitle(''); setContent(''); setImage(undefined); if (imageInput.current) imageInput.current.value = ''; onCreated(); onClose(); }
    catch { setError(t('Không gửi được yêu cầu. Nội dung của bạn vẫn được giữ để thử lại.', 'Unable to submit. Your text is preserved so you can retry.')); }
    finally { setBusy(false); }
  }
  return <Modal open={open} onOpenChange={value => { if (!value && !busy) onClose(); }} title={t('Tạo yêu cầu hỗ trợ', 'Create support request')} description={t('Vui lòng không gửi mật khẩu hoặc thông tin thẻ thanh toán.', 'Please do not include passwords or payment-card details.')}>
    <form className="gds-requests" onSubmit={submit}>
      {error && <p role="alert" className="gds-requests__error"><SystemText message={error} /></p>}
      <label>{t('Tiêu đề', 'Title')}<input value={title} onChange={event => setTitle(event.target.value)} minLength={3} maxLength={160} required disabled={busy} /></label>
      <label>{t('Nội dung', 'Content')}<textarea value={content} onChange={event => setContent(event.target.value)} minLength={5} maxLength={10000} rows={6} required disabled={busy} /></label>
      <label>{t('Ảnh đính kèm (tùy chọn)', 'Image attachment (optional)')}<input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || !enabled} onChange={event => {
        const file = event.target.files?.[0]; setError('');
        if (file && (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > maxMb * 1024 * 1024)) {
          setError(t('Chọn ảnh PNG, JPEG hoặc WebP trong giới hạn dung lượng.', 'Choose a PNG, JPEG or WebP image within the size limit.')); event.target.value = ''; setImage(undefined); return;
        }
        setImage(file);
      }} /></label>
      <p className="gds-requests__muted">{t('Tối đa', 'Maximum')} {maxMb} MB · PNG, JPEG, WebP</p>
      {preview && <div className="gds-support-image"><img src={preview} alt={t('Xem trước ảnh đính kèm', 'Attachment preview')} /><button type="button" disabled={busy} onClick={() => { setImage(undefined); if (imageInput.current) imageInput.current.value = ''; }}>{t('Xóa ảnh', 'Remove image')}</button></div>}
      <div className="gds-requests__actions"><button className="gds-requests__primary" type="submit" disabled={busy || !enabled}>{busy ? t('Đang gửi…', 'Submitting…') : t('Gửi yêu cầu', 'Submit request')}</button><button type="button" onClick={onClose} disabled={busy}>{t('Hủy', 'Cancel')}</button></div>
    </form>
  </Modal>;
}

function SupportConversation({ id, admin, enabled: supportEnabled, onChanged }: { id: string; admin: boolean; enabled: boolean; onChanged: () => void }) {
  const { t, locale, settings } = usePlatform();
  const [detail, setDetail] = useState<SupportDetail | null>(null); const [page, setPage] = useState(1); const [revision, setRevision] = useState(0);
  const enabled = detail?.requestType === 'invoice' ? settings.operations.invoiceRequestsEnabled : supportEnabled;
  const [reply, setReply] = useState(''); const [status, setStatus] = useState<SupportStatus>('open'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    let active = true; setError('');
    platformRequestsService.getSupport(admin, id, page).then(value => { if (active) { setDetail(value); setStatus(value.status); } })
      .catch(() => { if (active) setError(t('Không tải được nội dung trao đổi.', 'Unable to load this conversation.')); });
    return () => { active = false; };
  }, [admin, id, page, revision, locale]);
  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await action(); setRevision(value => value + 1); onChanged(); }
    catch { setError(t('Chưa lưu được thay đổi. Vui lòng thử lại.', 'Unable to save changes. Please retry.')); }
    finally { setBusy(false); }
  }
  return <div className="gds-requests">
    {error && <p role="alert" className="gds-requests__error"><SystemText message={error} /><button type="button" onClick={() => setRevision(value => value + 1)}>{t('Thử lại', 'Retry')}</button></p>}
    {!detail ? !error && <p role="status">{t('Đang tải…', 'Loading…')}</p> : <>
      <h2>{detail.title}</h2><p className="gds-requests__body">{detail.content}</p>
      {!!detail.attachmentSize && <SupportImage key={id + String(admin)} id={id} admin={admin} />}
      <span className={`gds-requests__badge gds-requests__badge--${detail.status}`}>{t(...supportLabels[detail.status])}</span>
      {admin && <div className="gds-requests__toolbar"><label>{t('Cập nhật trạng thái', 'Update status')}<select value={status} onChange={event => setStatus(event.target.value as SupportStatus)} disabled={busy}>{Object.entries(supportLabels).map(([key, value]) => <option key={key} value={key}>{t(...value)}</option>)}</select></label>
        <button type="button" disabled={busy || status === detail.status} onClick={() => void run(() => platformRequestsService.updateSupport(id, status))}>{t('Lưu trạng thái', 'Save status')}</button></div>}
      <h3>{t('Trao đổi', 'Conversation')}</h3>
      {!detail.replies.length && <p>{t('Chưa có phản hồi.', 'No replies yet.')}</p>}
      <ol className="gds-requests__thread">{detail.replies.map(item => <li key={item.id} className={item.isStaff ? 'gds-requests__reply--staff' : ''}>
        <strong>{item.isStaff ? t('Hỗ trợ GDS', 'GDS support') : t('Người gửi', 'Requester')}</strong><time dateTime={item.createdAt}>{new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</time>
        <p className="gds-requests__body">{item.content}</p>
      </li>)}</ol>
      <RequestPagination page={page} totalPages={detail.replyTotalPages} onChange={setPage} />
      {detail.status === 'closed' ? <p>{t('Yêu cầu đã đóng. Quản trị viên có thể mở lại để tiếp tục trao đổi.', 'This ticket is closed. An administrator can reopen it.')}</p> : <form onSubmit={event => { event.preventDefault(); if (!enabled || busy) return; void run(async () => { await platformRequestsService.reply(admin, id, reply.trim()); setReply(''); setPage(Math.max(1, Math.ceil((detail.replyTotal + 1) / 20))); }); }}>
        <label>{t('Phản hồi', 'Reply')}<textarea value={reply} onChange={event => setReply(event.target.value)} maxLength={10000} rows={4} required disabled={busy || !enabled} /></label>
        <button className="gds-requests__primary" type="submit" disabled={busy || !enabled || !reply.trim()}>{busy ? t('Đang gửi…', 'Sending…') : t('Gửi phản hồi', 'Send reply')}</button>
      </form>}
    </>}
  </div>;
}

export function RequestPagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  const { t } = usePlatform(); if (totalPages < 2) return null;
  return <nav className="gds-requests__pagination" aria-label={t('Phân trang yêu cầu', 'Request pagination')}>
    <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>{t('Trước', 'Previous')}</button><span>{page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>{t('Tiếp', 'Next')}</button>
  </nav>;
}

function SupportImage({ id, admin }: { id: string; admin: boolean }) {
  const { t } = usePlatform();
  const [url, setUrl] = useState(''); const [failed, setFailed] = useState(false); const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let objectUrl = ''; let active = true; setFailed(false); setUrl('');
    platformRequestsService.getSupportImage(admin, id, controller.signal).then(blob => {
      if (active) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [admin, id, revision]);
  return <div className="gds-support-image">{url ? <img src={url} alt={t('Ảnh đính kèm yêu cầu hỗ trợ', 'Support request attachment')} /> : failed ? <p role="alert">{t('Không tải được ảnh đính kèm.', 'Unable to load attachment.')} <button type="button" onClick={() => setRevision(value => value + 1)}>{t('Thử lại', 'Retry')}</button></p> : <p role="status">{t('Đang tải ảnh…', 'Loading image…')}</p>}</div>;
}
