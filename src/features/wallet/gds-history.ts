import type { GdsWalletSummary } from '../../services/gds-wallet.service';
import { withdrawalLabels, type Withdrawal } from '../../services/gds-withdrawal.service';

export type GdsJournalEntry = NonNullable<GdsWalletSummary['recentTransactions']>[number];
export interface GdsHistoryRow {
  id: string; occurredAt: string; label: string; description?: string; amountMinor: string;
  amountPrefix: string; amountHint?: string; status?: string; statusTone?: 'pending' | 'processing' | 'paid' | 'neutral'; withdrawalId?: string; income?: boolean;
}
const transactionLabels: Record<GdsJournalEntry['type'], string> = {
  WITHDRAWAL_RESERVE: 'Giữ GDS cho yêu cầu rút tiền', WITHDRAWAL_RELEASE: 'Giải phóng GDS đã giữ', WITHDRAWAL_PAID: 'Rút tiền về ngân hàng',
  REVENUE_CREDIT: 'Doanh thu giảng dạy vào GDS', REVENUE_REVERSAL: 'Điều chỉnh doanh thu do hoàn tiền',
  TOPUP_CREDIT: 'Nạp GDS đã xác minh', RESERVE: 'Giữ GDS cho đơn hàng', CAPTURE: 'Thanh toán bằng GDS', RELEASE: 'Hoàn GDS đã giữ',
};
const held = new Set(['PENDING', 'APPROVED', 'PROCESSING']);
const timestamp = (value: string | undefined) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
const effectPriority = (type: GdsJournalEntry['type']) => type === 'WITHDRAWAL_PAID' ? 2 : type === 'WITHDRAWAL_RELEASE' ? 1 : 0;
function requestRow(item: Withdrawal): GdsHistoryRow {
  return { id: `withdrawal-${item.id}`, withdrawalId: item.id, occurredAt: item.updatedAt && timestamp(item.updatedAt) > timestamp(item.createdAt) ? item.updatedAt : item.createdAt, label: 'Rút tiền về ngân hàng',
    description: `${item.bankShortName ?? item.bankCode} · ${item.accountNumber.replace(/.(?=.{4})/g, '•')}`,
    amountMinor: item.amountMinor, amountPrefix: item.status === 'PAID' ? '−' : '',
    amountHint: held.has(item.status) ? 'Đang giữ' : item.status === 'PAID' ? 'Đã chuyển' : 'Đã hoàn về ví', status: withdrawalLabels[item.status],
    statusTone: item.status === 'PROCESSING' ? 'processing' : item.status === 'PAID' ? 'paid' : held.has(item.status) ? 'pending' : 'neutral' };
}
function ledgerRow(entry: GdsJournalEntry): GdsHistoryRow {
  const income = ['TOPUP_CREDIT', 'RELEASE', 'REVENUE_CREDIT'].includes(entry.type);
  const withdrawal = entry.type.startsWith('WITHDRAWAL_');
  const holding = entry.type === 'WITHDRAWAL_RESERVE';
  const released = entry.type === 'WITHDRAWAL_RELEASE';
  return { id: `ledger-${entry.id}`, occurredAt: entry.occurredAt, label: transactionLabels[entry.type] ?? 'Giao dịch cần đối soát',
    amountMinor: entry.amountMinor, amountPrefix: holding || released ? '' : income ? '+' : '−', income,
    ...(withdrawal ? { withdrawalId: entry.withdrawalId, amountHint: holding ? 'Đang giữ' : released ? 'Đã hoàn về ví' : 'Đã chuyển' } : {}) };
}
/** Link immutable journal effects by server-provided request ID; never infer links from amounts or account details. */
export function buildGdsHistory(transactions: GdsJournalEntry[], requests: Withdrawal[]): GdsHistoryRow[] {
  const rows = new Map<string, GdsHistoryRow>();
  for (const item of requests) rows.set(`withdrawal-${item.id}`, requestRow(item));
  for (const entry of [...transactions].sort((a, b) => timestamp(b.occurredAt) - timestamp(a.occurredAt) || effectPriority(b.type) - effectPriority(a.type))) {
    if (entry.type.startsWith('WITHDRAWAL_') && entry.withdrawalId) {
      const key = `withdrawal-${entry.withdrawalId}`;
      const existing = rows.get(key);
      if (!existing) rows.set(key, { ...ledgerRow(entry), id: key, label: 'Rút tiền về ngân hàng' });
      else {
        if (existing.amountHint === 'Đang giữ' && effectPriority(entry.type) > 0) {
          const terminal = ledgerRow(entry);
          existing.amountPrefix = terminal.amountPrefix; existing.amountHint = terminal.amountHint;
          existing.status = entry.type === 'WITHDRAWAL_PAID' ? withdrawalLabels.PAID : 'Đã hoàn về ví';
          existing.statusTone = entry.type === 'WITHDRAWAL_PAID' ? 'paid' : 'neutral';
        }
        if (timestamp(entry.occurredAt) > timestamp(existing.occurredAt)) existing.occurredAt = entry.occurredAt;
      }
    } else rows.set(`ledger-${entry.id}`, ledgerRow(entry));
  }
  return [...rows.values()].sort((a, b) => timestamp(b.occurredAt) - timestamp(a.occurredAt) || a.id.localeCompare(b.id));
}
