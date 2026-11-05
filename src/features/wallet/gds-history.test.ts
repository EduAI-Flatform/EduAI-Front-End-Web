import { describe, expect, it } from 'vitest';
import { buildGdsHistory, filterGdsHistory } from './gds-history';
import type { Withdrawal } from '../../services/gds-withdrawal.service';
const request = { id: 'request-1', amountMinor: '10000', status: 'PENDING', bankCode: 'MB', accountNumber: '123456789', createdAt: '2026-11-05T01:00:00Z', updatedAt: '2026-11-05T01:00:00Z' } as Withdrawal;
describe('unified GDS history', () => {
  it('filters actual incoming/outgoing money without counting holds or releases twice', () => {
    const kinds = ['TOPUP_CREDIT', 'REVENUE_CREDIT', 'RESERVE', 'RELEASE', 'CAPTURE', 'REVENUE_REVERSAL', 'WITHDRAWAL_RESERVE', 'WITHDRAWAL_RELEASE', 'WITHDRAWAL_PAID'] as const;
    const rows = buildGdsHistory(kinds.map(type => ({ id: type, type, amountMinor: '10000', occurredAt: request.createdAt })), []);
    expect(filterGdsHistory(rows, 'incoming').map(row => row.id).sort()).toEqual(['ledger-REVENUE_CREDIT', 'ledger-TOPUP_CREDIT']);
    expect(filterGdsHistory(rows, 'outgoing').map(row => row.id).sort()).toEqual(['ledger-CAPTURE', 'ledger-REVENUE_REVERSAL', 'ledger-WITHDRAWAL_PAID']);
    expect(filterGdsHistory(rows, 'payments').map(row => row.id)).toEqual(['ledger-CAPTURE']);
    for (const type of ['RESERVE', 'RELEASE', 'WITHDRAWAL_RESERVE', 'WITHDRAWAL_RELEASE']) expect(rows.find(row => row.id === `ledger-${type}`)?.amountPrefix).toBe('');
  });
  it('does not show held money from a stale request after terminal journal evidence', () => {
    for (const type of ['WITHDRAWAL_PAID', 'WITHDRAWAL_RELEASE'] as const) {
      const [row] = buildGdsHistory([{ id: 'terminal', type, amountMinor: '10000', withdrawalId: request.id, occurredAt: '2026-11-05T02:00:00Z' }], [request]);
      expect(row.amountHint).toBe(type === 'WITHDRAWAL_PAID' ? 'Đã chuyển' : 'Đã hoàn về ví'); expect(row.status).not.toBe('Chờ duyệt');
    }
  });
  it('prioritizes both terminal effects over a hold at the same timestamp', () => {
    const entries = [{ id: 'hold', type: 'WITHDRAWAL_RESERVE' as const, amountMinor: '10000', withdrawalId: 'older', occurredAt: request.createdAt }];
    for (const type of ['WITHDRAWAL_PAID', 'WITHDRAWAL_RELEASE'] as const) {
      const [row] = buildGdsHistory([...entries, { ...entries[0], id: 'terminal', type }], []);
      expect(row.amountHint).toBe(type === 'WITHDRAWAL_PAID' ? 'Đã chuyển' : 'Đã hoàn về ví');
    }
  });
  it('interleaves request and ledger rows bytime and represents held money without a finaldebit', () => {
    const rows = buildGdsHistory([{ id: 'topup', type: 'TOPUP_CREDIT', amountMinor: '100000', occurredAt: '2026-11-05T02:00:00Z' }, { id: 'hold', type: 'WITHDRAWAL_RESERVE', amountMinor: '10000', withdrawalId: request.id, occurredAt: request.createdAt }], [request]);
    expect(rows.map(row => row.id)).toEqual(['ledger-topup', 'withdrawal-request-1']);
    expect(rows[1].amountPrefix).toBe(''); expect(rows[1].amountHint).toBe('Đang giữ'); expect(rows[1].description).not.toContain('123456789');
  });
  it('represents paid only once and never claims a canceled request as a debit', () => {
    const rows = buildGdsHistory([{ id: 'paid', type: 'WITHDRAWAL_PAID', amountMinor: '10000', withdrawalId: request.id, occurredAt: request.createdAt }], [{ ...request, status: 'PAID' }, { ...request, id: 'cancelled', status: 'CANCELLED' }]);
    expect(rows).toHaveLength(2); expect(rows.find(row => row.withdrawalId === request.id)?.amountPrefix).toBe('−'); expect(rows.find(row => row.withdrawalId === 'cancelled')?.amountHint).toBe('Đã hoàn về ví'); expect(rows.find(row => row.withdrawalId === 'cancelled')?.amountPrefix).toBe('');
  });
  it('groups linked records outside requestpage and preserves unlinked olderbackend records', () => {
    const rows = buildGdsHistory([{ id: 'hold', type: 'WITHDRAWAL_RESERVE', amountMinor: '10000', withdrawalId: 'older', occurredAt: '2026-11-05T01:00:00Z' }, { id: 'paid', type: 'WITHDRAWAL_PAID', amountMinor: '10000', withdrawalId: 'older', occurredAt: '2026-11-05T02:00:00Z' }, { id: 'legacy', type: 'WITHDRAWAL_RELEASE', amountMinor: '10000', occurredAt: '2026-11-04T01:00:00Z' }], []);
    expect(rows).toHaveLength(2); expect(rows[0].withdrawalId).toBe('older'); expect(rows[0].amountHint).toBe('Đã chuyển'); expect(rows[1].id).toBe('ledger-legacy');
  });
});
