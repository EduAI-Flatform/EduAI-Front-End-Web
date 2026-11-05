import { ArrowDownToLine, ArrowUpRight, CirclePlus, History, Sparkles, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { formatGdsVnd, hasTrustedGdsBalance, type GdsWalletSummary } from '../../services/gds-wallet.service';

interface Props {
  summary: GdsWalletSummary | null; loading: boolean; error: string | null;
  tmiPoints: number | null; tmiLoading: boolean; topupDisabled: boolean; withdrawDisabled: boolean;
  onTopup: () => void; onWithdraw: () => void; onRetry: () => void; onRetryIncome: () => void;
}
const stateMessages: Partial<Record<GdsWalletSummary['state'], string>> = {
  UNAVAILABLE: 'Ví đang tạm ngừng. Vui lòng thử lại sau.',
  NOT_INITIALIZED: 'Nạp tiền để bắt đầu sử dụng ví.',
  SUSPENDED: 'Ví đang tạm khóa. Vui lòng liên hệ hỗ trợ.',
  RECONCILIATION_REQUIRED: 'Chưa thể hiển thị số dư. Vui lòng thử lại sau.',
};

export function GdsWalletOverview({ summary, loading, error, tmiPoints, tmiLoading, topupDisabled, withdrawDisabled, onTopup, onWithdraw, onRetry, onRetryIncome }: Props) {
  const trusted = !loading && !error && hasTrustedGdsBalance(summary);
  const amount = (value?: string | null) => loading ? '—' : formatGdsVnd(trusted ? value : null);
  const income = trusted ? summary?.income : null;
  const hasDebt = trusted && typeof summary?.debtMinor === 'string' && /^[1-9]\d*$/.test(summary.debtMinor);
  const message = error ?? (summary ? stateMessages[summary.state] : null);
  const history = () => {
    const heading = document.getElementById('gds-history-title');
    heading?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    heading?.focus({ preventScroll: true });
  };
  return <>
    <header className="gds-wallet-page__heading"><span className="gds-wallet-page__heading-icon"><Wallet size={24} aria-hidden="true" /></span><div><h1>Ví của tôi</h1><p>Quản lý số dư và giao dịch của bạn</p></div></header>
    <div className="gds-wallet-overview">
      <section className="gds-wallet-page__balance-card" aria-labelledby="gds-balance-title" aria-busy={loading}>
        <div className="gds-wallet-page__balance-top"><span id="gds-balance-title">Số dư khả dụng</span><span className="gds-wallet-page__currency">GDS / VND</span></div>
        <strong className={`gds-wallet-page__balance-value${loading ? ' is-loading' : ''}`} aria-live="polite">{amount(summary?.balance?.availableMinor)}</strong>
        <dl className="gds-wallet-page__balance-metrics">
          <div><dt>Đang giữ cho thanh toán</dt><dd>{amount(summary?.paymentHeldMinor)}</dd></div>
          <div><dt>Đang chờ rút</dt><dd>{amount(summary?.withdrawalHeldMinor)}</dd></div>
          <div><dt>Tổng số dư</dt><dd>{amount(summary?.balance?.settledMinor)}</dd></div>
        </dl>
        {message ? <div className="gds-wallet-page__balance-message"><p role={error ? 'alert' : 'status'}>{message}</p>{error || summary?.state === 'RECONCILIATION_REQUIRED' ? <Button variant="outline" onClick={onRetry}>Thử lại số dư</Button> : null}</div> : null}
      </section>
      <nav className="gds-wallet-actions" aria-label="Thao tác ví">
        <Button type="button" disabled={topupDisabled} onClick={onTopup}><CirclePlus size={21} aria-hidden="true" />Nạp tiền</Button>
        <Button type="button" variant="outline" disabled={withdrawDisabled || hasDebt} onClick={onWithdraw}><ArrowDownToLine size={21} aria-hidden="true" />Rút tiền</Button>
        <Button type="button" variant="outline" onClick={history}><History size={21} aria-hidden="true" />Lịch sử</Button>
      </nav>
      {hasDebt ? <aside className="gds-wallet-debt" aria-label="Công nợ"><div><strong>Công nợ</strong><p>Chưa thể rút tiền khi còn công nợ.</p></div><b>{amount(summary?.debtMinor)}</b></aside> : null}
      <section className="gds-wallet-page__tmi-card" aria-labelledby="gds-tmi-title">
        <span className="gds-wallet-page__tmi-icon"><Sparkles size={21} aria-hidden="true" /></span><h2 id="gds-tmi-title">Điểm thưởng TMI</h2>
        <strong className="gds-wallet-page__tmi-points" aria-live="polite">{tmiLoading || tmiPoints === null ? '—' : `${new Intl.NumberFormat('vi-VN').format(tmiPoints)} điểm`}</strong>
        <Link className="gds-wallet-page__text-link" to="/dashboard/tmi">Đổi điểm thưởng TMI <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </section>
      {income ? <section className="gds-wallet-income" aria-labelledby="gds-income-title"><header><h2 id="gds-income-title">Thu nhập</h2><span>Toàn thời gian</span></header>
        <dl><div><dt>Tổng thu nhập</dt><dd>{amount(income.totalMinor)}</dd></div><div><dt>Đã ghi nhận</dt><dd>{amount(income.recognizedMinor)}</dd></div><div><dt>Chờ ghi nhận</dt><dd>{amount(income.pendingMinor)}</dd></div></dl>
        {income.status === 'UNAVAILABLE' ? <div className="gds-wallet-income__notice"><p>Chưa tải được thu nhập.</p><Button type="button" variant="ghost" onClick={onRetryIncome}>Thử lại thu nhập</Button></div> : income.reviewPendingMinor && /^[1-9]\d*$/.test(income.reviewPendingMinor) ? <p className="gds-wallet-income__notice">{formatGdsVnd(income.reviewPendingMinor)} thu nhập cũ đang chờ kiểm tra.</p> : null}
      </section> : null}
      <section className="gds-wallet-total-withdrawn" aria-label="Tổng đã rút"><div><span>Tổng đã rút</span><strong>{amount(summary?.totalWithdrawnMinor)}</strong></div><ArrowUpRight size={24} aria-hidden="true" /></section>
    </div>
  </>;
}
