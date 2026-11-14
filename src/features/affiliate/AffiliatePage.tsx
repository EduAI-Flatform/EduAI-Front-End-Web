import { SystemValue, SystemText } from '@/features/platform/SystemText';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { affiliateService, type AffiliateFilters, type AffiliatePage as Page, type AffiliateState } from '../../services/affiliate.service';
import { useAuthSession } from '../auth/auth-store';
import { usePlatform } from '../platform/PlatformProvider';
import './AffiliatePage.css';
import { AffiliateWithdrawal } from './AffiliateWithdrawal';
export function AffiliatePage() {
  const { t, locale } = usePlatform();
  function referralKindName(kind: string) {
    switch (kind) {
      case 'general': return t('Thông thường', 'General');
      case 'instructor': return t('Giảng viên', 'Instructor');
      default: return kind;
    }
  }
  const session = useAuthSession();
  const [tab, setTab] = useState<'dashboard' | 'withdraw' | 'performance'>('dashboard');
  const [state, setState] = useState<AffiliateState | null>(null);
  const [rows, setRows] = useState<Page | null>(null);
  const [filters, setFilters] = useState<AffiliateFilters>({ page: 1 });
  const [search, setSearch] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState('');
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  async function load() { setState(await affiliateService.state()); setRows(await affiliateService.list(filters)); }
  useEffect(() => { let current = true; Promise.all([affiliateService.state(), affiliateService.list(filters)]).then(([s, p]) => {
    if (current) { setState(s); setRows(p); }
  }).catch(() => { if (current) setError(t('Không tải được thông tin referral.', 'Unable to load referral information.')); });
    return () => { current = false; };
  }, [filters]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch { setError(t('Thao tác chưa hoàn tất. Vui lòng thử lại.', 'The action could not be completed. Please try again.')); }
    finally { setBusy(false); }
  }
  const money = (amount: string) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(BigInt(amount));
  async function download() {
    const file = await affiliateService.export(filters);
    const bytes = Uint8Array.from(atob(file.dataBase64), c => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: file.contentType }));
    const link = document.createElement('a'); link.href = url; link.download = file.filename; link.click(); URL.revokeObjectURL(url);
  }
  async function refreshCommission() {
    const result = await affiliateService.reconcile(); await load();
    const insufficient = result.items.some(item => item.walletCreditStatus === 'AFFILIATE_PLATFORM_FEE_INSUFFICIENT');
    setNotice(insufficient
      ? t('Đã đối soát. Một số hoa hồng chưa được ghi có vì phí nền tảng của đơn hàng không đủ.', 'Reconciled. Some commission remains unfunded because the order’s platform fee is insufficient.')
      : t('Đã cập nhật hoa hồng và số dư ví.', 'Commission and wallet balance updated.'));
  }
  return <section className="affiliate-page container"><header><h1>{t('Doanh thu và referral', 'Revenue and referrals')}</h1></header>
    <nav className="affiliate-page__tabs" aria-label={t('Điều hướng referral', 'Referral navigation')}>
      {(['dashboard', 'withdraw', 'performance'] as const).map(value => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>
        {value === 'dashboard' ? <SystemText message={"Bảng điều khiển"} /> : value === 'withdraw' ? t('Rút tiền', 'Withdraw') : <SystemText message={"Hiệu quả tiếp thị liên kết"} />}
      </button>)}
    </nav>
    {error && <p role="alert"><SystemText message={error} /></p>}{notice && <p role="status"><SystemText message={notice} /></p>}
    {!state && !error && <p role="status">{t('Đang tải…', 'Loading…')}</p>}
    {state && tab === 'dashboard' && <>
      {!state.enabled && <p role="status">{t('Chương trình referral chưa được mở.', 'The referral program is not open yet.')}</p>}
      <div className="affiliate-page__metrics">
        <article><h2>{t('Referral đã ghi nhận', 'Recorded referrals')}</h2><strong>{state.totalReferrals}</strong></article>
        <article><h2>{t('Hoa hồng đã ghi nhận', 'Accrued commission')}</h2><strong>{money(state.accruedAmountMinor)}</strong></article>
        <article><h2>{t('Số dư khả dụng ví GDS', 'Available GDS wallet balance')}</h2><strong>{state.availableBalanceMinor === null ? t('Chưa khả dụng', 'Unavailable') : money(state.availableBalanceMinor)}</strong></article>
      </div>
      <section className="affiliate-page__panel"><h2>{t('Thông tin referral', 'Referral information')}</h2>
        {(['general', ...(session?.user.roles.includes('instructor') ? ['instructor'] : [])] as Array<'general' | 'instructor'>).map(kind => {
          const identity = state.identities.find(item => item.kind === kind);
          const url = identity ? identity.referralUrl || window.location.origin + '/?ref=' + identity.code : '';
          return <div key={kind} className="affiliate-page__identity"><h3>{kind === 'instructor' ? t('Referral giảng viên', 'Instructor referral') : t('Referral của bạn', 'Your referral')}</h3>
            {identity ? <><label>{t('Liên kết referral', 'Referral link')}<input readOnly value={url} /></label><label>{t('Mã referral', 'Referral code')}<input readOnly value={identity.code} /></label>
              {identity.qrCodeDataUrl && <img className="affiliate-page__qr" src={identity.qrCodeDataUrl} width={180} height={180} alt={t('Mã QR liên kết referral', 'Referral link QR code')} />}
              <button disabled={busy} onClick={() => void run(async () => { await navigator.clipboard.writeText(url); setNotice(t('Đã sao chép.', 'Copied.')); })}>{t('Sao chép liên kết', 'Copy link')}</button></>
              : <button disabled={busy || !state.enabled} onClick={() => void run(async () => { await affiliateService.createIdentity(kind); await load(); })}>{t('Tạo mã referral', 'Create referral code')}</button>}
          </div>;
        })}
      </section>
    </>}
    {state && tab === 'withdraw' && <section className="affiliate-page__panel"><h2>{t('Rút hoa hồng', 'Withdraw commission')}</h2>
      <p>{t('Hoa hồng đủ điều kiện được ghi vào cùng ví GDS sau thời gian giữ. Yêu cầu rút tiền được Admin kiểm tra và chuyển khoản thủ công.', 'Eligible commission joins your GDS wallet after the hold period. Admin reviews withdrawal requests and transfers funds manually.')}</p>
      {state.walletCreditStatus === 'FUNDING_NOT_CONFIGURED' && <p role="status">{t('Nguồn chi hoa hồng chưa được cấu hình cho chính sách này.', 'Commission funding has not been configured for this policy.')}</p>}
      {state.walletCreditStatus === 'PROCESSING_DISABLED' && <p role="status">{t('Xử lý ghi có và rút tiền đang tạm đóng.', 'Wallet credit and withdrawals are currently paused.')}</p>}
      <p>{t('Số dư ví GDS bao gồm các nguồn tiền đã ghi có. Hoa hồng vượt phần phí nền tảng của đơn hàng sẽ chưa được ghi có; quyền lợi người bán được giữ nguyên.', 'Your GDS balance includes all credited funds. Commission exceeding the order’s platform fee remains unfunded; seller entitlements are preserved.')}</p>
      <button disabled={busy} onClick={() => void run(refreshCommission)}>{t('Cập nhật hoa hồng', 'Refresh commission')}</button>
      <AffiliateWithdrawal onChanged={() => void run(load)} />
      <Link to="/wallet/gds">{t('Mở ví GDS', 'Open GDS wallet')}</Link>
    </section>}
    {state && tab === 'performance' && <section className="affiliate-page__panel">
      <form className="affiliate-page__filters" onSubmit={e => {
        e.preventDefault();
        setFilters({ page: 1, search, ...(from ? { from: new Date(from + 'T00:00:00').toISOString() } : {}), ...(to ? { to: new Date(to + 'T23:59:59.999').toISOString() } : {}) });
      }}>
        <label>{t('Tìm tên người dùng', 'Search user name')}<input value={search} maxLength={100} onChange={e => setSearch(e.target.value)} /></label>
        <label>{t('Từ ngày', 'From date')}<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>{t('Đến ngày', 'To date')}<input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} /></label>
        <button>{t('Lọc', 'Filter')}</button>
      </form>
      <div className="affiliate-page__actions">
        <button disabled={busy} onClick={() => void run(refreshCommission)}>{t('Đối soát hoa hồng', 'Reconcile commission')}</button>
        <button disabled={busy || !rows?.items.length} onClick={() => void run(download)}>{t('Xuất Excel trang hiện tại', 'Export current page to Excel')}</button>
      </div>
      {rows && !rows.items.length && <p>{t('Chưa có referral được ghi nhận.', 'No referrals have been recorded.')}</p>}
      <div className="affiliate-page__records">{rows?.items.map(row => <article key={row.id}>
        <h3>{row.userName}</h3><p>{row.orderNumber} · {referralKindName(row.kind)}</p><p><SystemValue render={() => (new Date(row.createdAt).toLocaleString(locale))} /></p>
        <p>{t('Hoa hồng ghi nhận', 'Accrued commission')} {row.accruedAmountMinor === null ? '—' : money(row.accruedAmountMinor)}</p>
        <small>{t('Phiên bản chính sách', 'Policy revision')} {row.policyRevisionId}</small>
        <p>{row.walletCreditStatus === 'SYNCED' ? t('Đã đối soát vào ví GDS.', 'Reconciled to the GDS wallet.')
          : row.walletCreditStatus === 'HELD' ? t('Đang trong thời gian giữ hoa hồng.', 'Commission is in its hold period.')
          : row.walletCreditStatus === 'AFFILIATE_PLATFORM_FEE_INSUFFICIENT' ? t('Phí nền tảng còn lại chưa đủ để ghi có hoa hồng.', 'The remaining platform fee cannot fund this commission.')
          : t('Chưa ghi có; cần đủ điều kiện và nguồn chi đã cấu hình.', 'Awaiting eligibility and configured funding.')}</p>
      </article>)}</div>
      {rows && <div className="affiliate-page__actions"><button disabled={busy || rows.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>{t('Trước', 'Previous')}</button><span>{rows.page} / {Math.max(1, rows.totalPages)}</span><button disabled={busy || rows.page >= rows.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>{t('Tiếp', 'Next')}</button></div>}
    </section>}
  </section>;
}
