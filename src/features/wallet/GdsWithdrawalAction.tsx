import { useId, type ReactNode } from 'react';
import { ArrowUpRight, CircleCheck, CircleAlert, Landmark, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatGdsVnd, type GdsWalletSummary } from '../../services/gds-wallet.service';
import type { WithdrawalSettings } from '../../services/gds-withdrawal.service';
import './GdsWithdrawalAction.css';

interface Props {
  summary: GdsWalletSummary;
  settings: WithdrawalSettings | null;
  disabled: boolean;
  onWithdraw: () => void;
  children?: ReactNode;
}
export function GdsWithdrawalAction({ summary, settings, disabled, onWithdraw, children }: Props) {
  const id = useId();
  const debt = summary.debtMinor;
  const knownDebt = typeof debt === 'string' && /^(0|[1-9]\d{0,29})$/.test(debt);
  const hasDebt = knownDebt && BigInt(debt) > 0n;
  const zeroDebt = debt === '0';
  return <section className="gds-withdrawal-action" aria-labelledby={`${id}-title`}>
    <header className="gds-withdrawal-action-header">
      <span className="gds-withdrawal-action-icon"><Landmark size={25} aria-hidden="true" /></span>
      <div className="gds-withdrawal-action-copy"><h2 id={`${id}-title`}>Rút tiền về ngân hàng</h2><p>Admin duyệt và chuyển khoản thủ công.</p><p className="gds-withdrawal-action-policy"><span>Miễn phí · 0đ</span>{settings ? <>Hạn mức: <strong>{formatGdsVnd(settings.minimumMinor)} – {formatGdsVnd(settings.maximumMinor)}</strong> mỗi lần</> : 'Hạn mức đang được cập nhật.'}</p></div>
      <Button type="button" className="gds-withdrawal-action-cta" disabled={disabled || hasDebt} aria-describedby={hasDebt ? `${id}-debt-warning` : undefined} onClick={onWithdraw}>Rút tiền <ArrowUpRight size={18} aria-hidden="true" /></Button>
    </header>
    <dl className="gds-withdrawal-action-metrics">
      <div><dt><LockKeyhole size={16} aria-hidden="true" />Đang giữ</dt><dd><span>{formatGdsVnd(summary.balance?.reservedMinor)}</span><p>Tiền tạm giữ cho đơn hàng và yêu cầu rút tiền.</p></dd></div>
      <div className={hasDebt ? 'gds-withdrawal-action-debt' : ''}><dt>{hasDebt ? <CircleAlert size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}Công nợ</dt><dd><span>{formatGdsVnd(debt)}</span><p className={zeroDebt ? 'gds-withdrawal-action-clear' : ''}>{zeroDebt ? <><CircleCheck size={14} aria-hidden="true" />Không có công nợ cần bù.</> : hasDebt ? 'Cần bù công nợ trước khi rút tiền.' : 'Chưa có thông tin công nợ đã xác nhận.'}</p></dd></div>
    </dl>
    {hasDebt ? <p id={`${id}-debt-warning`} className="gds-withdrawal-action-warning" role="alert"><CircleAlert size={18} aria-hidden="true" /><span>Bạn còn công nợ nên chưa thể rút tiền. Doanh thu tiếp theo sẽ bù công nợ trước khi cộng vào GDS.</span></p> : null}
    {children ? <div className="gds-withdrawal-action-messages">{children}</div> : null}
  </section>;
}
