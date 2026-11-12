import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LegacyMembershipInventory } from './LegacyMembershipInventory';
import type { LegacyInventory } from '../../../services/legacy-membership.service';

const mocks = vi.hoisted(() => ({ inventory: vi.fn(), report: vi.fn(), locale: 'vi' }));
vi.mock('../../../services/legacy-membership.service', async original => ({ ...await original<typeof import('../../../services/legacy-membership.service')>(), legacyMembershipService: mocks }));
vi.mock('../../platform/PlatformProvider', () => ({ usePlatform: () => ({ t: (vi: string, en: string) => mocks.locale === 'en' ? en : vi }) }));
const data: LegacyInventory = { source: 'orders', scope: 'source_page', readOnly: true, migrationReadiness: 'not_assessed',
  observedAt: '2026-11-12T00:00:00Z', requiredSources: ['orders', 'subscriptions', 'course_grants', 'service_grants'], pageSize: 20,
  hasMore: true, nextCursor: 'cursor', items: [{ id: 'linked', orderId: 'order', code: 'ORDER_RECONCILIATION_REQUIRED' }, { id: 'orphan', orderId: null, code: 'SOURCE_ORDER_MISSING' }] };
beforeEach(() => { mocks.locale = 'vi'; mocks.inventory.mockReset().mockResolvedValue(data); mocks.report.mockReset().mockResolvedValue({ orderId: 'order', status: 'attention', readOnly: true, scope: 'single_order', purchasedAccessPreserved: true, findings: [{ code: 'COURSE_GRANT_MISSING', resourceId: 'course' }] }); });
describe('Historical membership inventory', () => {
  it('opens linked orders only and localizes findings without offering data mutations', async () => {
    render(<LegacyMembershipInventory />);
    expect(await screen.findByText('orphan')).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Xem đối soát' })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Xem đối soát' }));
    expect(await screen.findByText('Thiếu quyền khóa học')).toBeVisible();
    expect(mocks.report).toHaveBeenCalledWith('order');
    expect(screen.queryByRole('button', { name: /sửa|xóa|thanh toán/i })).not.toBeInTheDocument();
  });
  it('uses server cursor for next and previous, clearing it when source changes', async () => {
    render(<LegacyMembershipInventory />); await screen.findByText('linked');
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp theo' }));
    await waitFor(() => expect(mocks.inventory).toHaveBeenLastCalledWith('orders', 'cursor'));
    await userEvent.click(screen.getByRole('button', { name: 'Trước' }));
    await waitFor(() => expect(mocks.inventory).toHaveBeenLastCalledWith('orders', undefined));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Nguồn dữ liệu' }), 'subscriptions');
    await waitFor(() => expect(mocks.inventory).toHaveBeenLastCalledWith('subscriptions', undefined));
  });
  it('does not show an old report after source changes during a pending request', async () => {
    let finish!: (result: unknown) => void;
    mocks.report.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<LegacyMembershipInventory />); await screen.findByText('linked');
    await userEvent.click(screen.getByRole('button', { name: 'Xem đối soát' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Nguồn dữ liệu' }), 'course_grants');
    finish({ orderId: 'stale', status: 'reconciled', findings: [] });
    await waitFor(() => expect(mocks.inventory).toHaveBeenLastCalledWith('course_grants', undefined));
    expect(screen.queryByText('stale')).not.toBeInTheDocument();
  });
  it('provides localized error recovery and empty-page scope in English', async () => {
    mocks.locale = 'en'; mocks.inventory.mockRejectedValueOnce(new Error('private internal failure'));
    render(<LegacyMembershipInventory />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load historical sources. Try again.');
    expect(screen.queryByText('private internal failure')).not.toBeInTheDocument();
    mocks.inventory.mockResolvedValue({ ...data, hasMore: false, nextCursor: null, items: [] });
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(await screen.findByText('No records on this page.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
