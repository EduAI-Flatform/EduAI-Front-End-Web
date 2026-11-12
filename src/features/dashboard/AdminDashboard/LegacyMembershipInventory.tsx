import { useEffect, useRef, useState } from 'react';
import { LEGACY_SOURCES, legacyMembershipService, type LegacyInventory, type LegacyReport, type LegacySource } from '../../../services/legacy-membership.service';
import { usePlatform } from '../../platform/PlatformProvider';
import { legacyLabels } from './legacy-membership-labels';
import './LegacyMembershipInventory.css';

export function LegacyMembershipInventory() {
  const { t } = usePlatform();
  const [position, setPosition] = useState<{ source: LegacySource; after?: string; previous: Array<string | undefined> }>({ source: 'orders', previous: [] });
  const [page, setPage] = useState<LegacyInventory | null>(null);
  const [report, setReport] = useState<LegacyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reportError, setReportError] = useState(false);
  const [reload, setReload] = useState(0);
  const [findingLimit, setFindingLimit] = useState(50);
  const reportSequence = useRef(0);
  const label = (code: string) => legacyLabels[code] ? t(...legacyLabels[code]) : t('Cần rà soát', 'Review required');
  function clearReport() {
    reportSequence.current++; setReport(null); setReportLoading(false); setReportError(false); setFindingLimit(50);
  }
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false); setPage(null); clearReport();
    legacyMembershipService.inventory(position.source, position.after)
      .then(result => { if (active) setPage(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; reportSequence.current++; };
  }, [position.source, position.after, reload]);
  async function inspect(orderId: string) {
    const sequence = ++reportSequence.current;
    setReport(null); setReportError(false); setReportLoading(true); setFindingLimit(50);
    try {
      const result = await legacyMembershipService.report(orderId);
      if (sequence === reportSequence.current) setReport(result);
    } catch { if (sequence === reportSequence.current) setReportError(true); }
    finally { if (sequence === reportSequence.current) setReportLoading(false); }
  }
  return <section className="legacy-inventory" aria-labelledby="legacy-inventory-title">
    <header><h2 id="legacy-inventory-title">{t('Đối soát quyền lợi cũ', 'Historical rights')}</h2>
      <p>{t('Chỉ đọc. Quyền học đã mua, thời hạn gốc và hạn mức đã sử dụng được giữ nguyên.', 'Read only. Purchased access, original validity and consumed quotas stay unchanged.')}</p></header>
    <div className="legacy-inventory__controls">
      <label>{t('Nguồn dữ liệu', 'Data source')}<select value={position.source} onChange={event => { clearReport(); setPosition({ source: event.target.value as LegacySource, previous: [] }); }}>
        {LEGACY_SOURCES.map(source => <option key={source} value={source}>{label(source)}</option>)}
      </select></label>
      <button type="button" disabled={loading} onClick={() => { clearReport(); setReload(value => value + 1); }}>{t('Tải lại', 'Reload')}</button>
    </div>
    <p className="legacy-inventory__scope">{t('Duyệt hết một nguồn hoặc trang không có nghĩa đã hoàn tất chuyển đổi. Đơn liên kết vẫn cần được đối soát.', 'Finishing a source or page does not establish completed migration. Linked orders still require reconciliation.')}</p>
    {error && <p role="alert">{t('Không tải được danh sách quyền cũ. Vui lòng thử lại.', 'Unable to load historical sources. Try again.')}</p>}
    <div className="legacy-inventory__grid">
      <section aria-label={t('Danh sách nguồn cũ', 'Historical source list')} aria-busy={loading}>
        {loading && <p role="status">{t('Đang tải danh sách…', 'Loading sources…')}</p>}
        {page && !page.items.length && <p role="status">{t('Trang này không có bản ghi.', 'No records on this page.')}</p>}
        <ul className="legacy-inventory__records">{page?.items.map(item => <li key={item.id}>
          <strong>{label(item.code)}</strong><code>{item.id}</code>
          {item.orderId ? <><span>{t('Đơn gốc', 'Source order')}</span><code>{item.orderId}</code>
            <button type="button" disabled={reportLoading} onClick={() => void inspect(item.orderId!)}>{t('Xem đối soát', 'View reconciliation')}</button></>
            : <span>{t('Chưa có liên kết đơn gốc đã xác định.', 'No verified source order link.')}</span>}
        </li>)}</ul>
        <nav className="legacy-inventory__pagination" aria-label={t('Phân trang nguồn cũ', 'Historical source pagination')}>
          <button type="button" disabled={loading || !position.previous.length} onClick={() => { clearReport(); setPosition(current => ({ ...current, after: current.previous[current.previous.length - 1], previous: current.previous.slice(0, -1) })); }}>{t('Trước', 'Previous')}</button>
          <span>{t(`Trang ${position.previous.length + 1}`, `Page ${position.previous.length + 1}`)}</span>
          <button type="button" disabled={loading || !page?.hasMore || !page.nextCursor} onClick={() => { clearReport(); setPosition(current => ({ ...current, after: page!.nextCursor!, previous: [...current.previous, current.after] })); }}>{t('Tiếp theo', 'Next')}</button>
        </nav>
      </section>
      <section className="legacy-inventory__detail" aria-labelledby="legacy-report-title" aria-busy={reportLoading}>
        <h3 id="legacy-report-title">{t('Chi tiết đối soát', 'Reconciliation detail')}</h3>
        {reportLoading && <p role="status">{t('Đang đối soát…', 'Loading reconciliation…')}</p>}
        {reportError && <p role="alert">{t('Không tải được báo cáo. Chọn lại đơn để thử lại.', 'Unable to load the report. Select the order to retry.')}</p>}
        {!report && !reportLoading && !reportError && <p>{t('Chọn một đơn liên kết để xem báo cáo.', 'Select a linked order to inspect its report.')}</p>}
        {report && <><code>{report.orderId}</code>
          <p className={`legacy-inventory__result legacy-inventory__result--${report.status}`}>{report.status === 'reconciled'
            ? t('Các bản ghi trong đơn khớp tại lần đọc này.', 'Order records match in this snapshot.')
            : report.status === 'blocked' ? t('Chưa đủ điều kiện đối soát.', 'Reconciliation prerequisites are not met.') : t('Có phát hiện cần rà soát.', 'Findings require review.')}</p>
          <ul className="legacy-inventory__findings">{report.findings.slice(0, findingLimit).map((finding, index) => <li key={`${finding.code}:${finding.resourceId}:${index}`}>
            <strong>{label(finding.code)}</strong><small>{finding.code}</small>{finding.resourceId && <code>{finding.resourceId}</code>}
          </li>)}</ul>
          {report.findings.length > findingLimit && <button type="button" onClick={() => setFindingLimit(value => value + 50)}>{t('Xem thêm phát hiện', 'Show more findings')}</button>}
        </>}
      </section>
    </div>
  </section>;
}
