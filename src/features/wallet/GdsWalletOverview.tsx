import { SystemValue } from '@/features/platform/SystemText';
import { currentSystemLocale } from "../platform/translate-system-message";
import { SystemText, useSystemMessages } from "../platform/SystemText";
import { ArrowDownToLine, ArrowUpRight, CirclePlus, Sparkles, Wallet } from 'lucide-react';
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
  const messageForUi = useSystemMessages();
  const trusted = !loading && !error && hasTrustedGdsBalance(summary);
  const amount = (value?: string | null) => loading ? '—' : formatGdsVnd(trusted ? value : null);
  const income = trusted ? summary?.income : null;
  const hasDebt = trusted && typeof summary?.debtMinor === 'string' && /^[1-9]\d*$/.test(summary.debtMinor);
  const message = error ?? (summary ? stateMessages[summary.state] : null);
  return <>
    <header className="gds-wallet-page__heading"><span className="gds-wallet-page__heading-icon"><Wallet size={24} aria-hidden="true" /></span><div><h1><SystemText message={"Ví của tôi"} /></h1><p><SystemText message={"Quản lý số dư và giao dịch của bạn"} /></p></div></header>
    <div className="gds-wallet-overview">
      <section className="gds-wallet-page__balance-card" aria-labelledby="gds-balance-title" aria-busy={loading}>
        <div className="gds-wallet-page__balance-top"><span id="gds-balance-title"><SystemText message="Số dư khả dụng" /></span><span className="gds-wallet-page__currency">GDS / VND</span></div>
        <strong className={`gds-wallet-page__balance-value${loading ? ' is-loading' : ''}`} aria-live="polite">{amount(summary?.balance?.availableMinor)}</strong>
        {trusted && [summary?.paymentHeldMinor, summary?.withdrawalHeldMinor].some(value => typeof value === 'string' && /^[1-9]\d*$/.test(value)) ? <dl className="gds-wallet-page__balance-metrics">
          {summary?.paymentHeldMinor && /^[1-9]\d*$/.test(summary.paymentHeldMinor) ? <div><dt><SystemText message={"Đang giữ cho thanh toán"} /></dt><dd>{amount(summary.paymentHeldMinor)}</dd></div> : null}
          {summary?.withdrawalHeldMinor && /^[1-9]\d*$/.test(summary.withdrawalHeldMinor) ? <div><dt><SystemText message={"Đang chờ rút"} /></dt><dd>{amount(summary.withdrawalHeldMinor)}</dd></div> : null}
        </dl> : null}
        {message ? <div className="gds-wallet-page__balance-message"><p role={error ? 'alert' : 'status'}>{message}</p>{error || summary?.state === 'RECONCILIATION_REQUIRED' ? <Button variant="outline" onClick={onRetry}><SystemText message={"Thử lại số dư"} /></Button> : null}</div> : null}
      </section>
      <nav className="gds-wallet-actions" aria-label={messageForUi("Thao tác ví")}>
        <Button type="button" disabled={topupDisabled} onClick={onTopup}><CirclePlus size={21} aria-hidden="true" /><SystemText message="Nạp tiền" /></Button>
        <Button type="button" variant="outline" disabled={withdrawDisabled || hasDebt} onClick={onWithdraw}><ArrowDownToLine size={21} aria-hidden="true" /><SystemText message="Rút tiền" /></Button>
      </nav>
      {hasDebt ? <aside className="gds-wallet-debt" aria-label={messageForUi("Công nợ")}><div><strong><SystemText message={"Công nợ"} /></strong><p><SystemText message={"Chưa thể rút tiền khi còn công nợ."} /></p></div><b>{amount(summary?.debtMinor)}</b></aside> : null}
      <section className="gds-wallet-page__tmi-card" aria-labelledby="gds-tmi-title">
        <span className="gds-wallet-page__tmi-icon"><Sparkles size={21} aria-hidden="true" /></span><h2 id="gds-tmi-title"><SystemText message={"Điểm thưởng GDS Point"} /></h2>
        <strong className="gds-wallet-page__tmi-points" aria-live="polite">{tmiLoading || tmiPoints === null ? '—' : `${new Intl.NumberFormat(currentSystemLocale()).format(tmiPoints)}${messageForUi(" điểm")}`}</strong>
        <Link className="gds-wallet-page__text-link" to="/dashboard/tmi"><SystemText message={"Đổi điểm thưởng GDS Point"} /> <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </section>
      <section className="gds-wallet-totals" aria-label={messageForUi("Thống kê giao dịch")}><dl>
        <div><dt><SystemText message={"Tổng đã nạp"} /></dt><dd>{amount(summary?.totalDepositedMinor)}</dd></div>
        <div><dt><SystemText message={"Đã thanh toán bằng GDS"} /></dt><dd>{amount(summary?.totalPaidMinor)}</dd></div>
        <div><dt><SystemText message={"Tổng đã rút"} /></dt><dd>{amount(summary?.totalWithdrawnMinor)}</dd></div>
      </dl></section>
      {income ? <section className="gds-wallet-income" aria-labelledby="gds-income-title"><header><h2 id="gds-income-title"><SystemText message={"Thu nhập"} /></h2><span><SystemText message="Toàn thời gian" /></span></header>
        <dl><div><dt><SystemText message={"Tổng thu nhập"} /></dt><dd>{amount(income.totalMinor)}</dd></div><div><dt><SystemText message={"Đã ghi nhận"} /></dt><dd>{amount(income.recognizedMinor)}</dd></div><div><dt><SystemText message={"Chờ ghi nhận"} /></dt><dd>{amount(income.pendingMinor)}</dd></div></dl>
        {income.status === 'UNAVAILABLE' ? <div className="gds-wallet-income__notice"><p><SystemText message={"Chưa tải được thu nhập."} /></p><Button type="button" variant="ghost" onClick={onRetryIncome}><SystemText message={"Thử lại thu nhập"} /></Button></div> : income.reviewPendingMinor && /^[1-9]\d*$/.test(income.reviewPendingMinor) ? <p className="gds-wallet-income__notice"><SystemValue render={() => (formatGdsVnd(income.reviewPendingMinor))} /> <SystemText message={"thu nhập cũ đang chờ kiểm tra."} /></p> : null}
      </section> : null}

    </div>
  </>;
}
