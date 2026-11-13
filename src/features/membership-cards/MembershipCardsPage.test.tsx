import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MembershipCardsPage } from './MembershipCardsPage';
const mocks = vi.hoisted(() => ({ mine: vi.fn(), quotas: vi.fn().mockResolvedValue({ cardItems: [], evaluatedAt: '2026-11-13T00:00:00Z' }) }));
vi.mock('../../services/membership-cards.service', () => ({ membershipCardsService: mocks }));
describe('membership card page', () => {
  it('labels verified top-ups correctly for an Admin-defined fourth tier', async () => {
    const tier = { code: 'diamond', name: { vi: 'Hạng mới', en: 'Custom tier' }, threshold: 0, benefits: [] };
    mocks.mine.mockResolvedValue({ policy: { enabled: true, basis: 'topup', currency: 'VND', tiers: [tier] },
      evaluation: { status: 'evaluated', basis: 'topup', tier, qualifyingAmountMinor: '100000' }, legacyPurchasedAccessPreserved: true });
    render(<MemoryRouter><MembershipCardsPage /></MemoryRouter>);
    expect(await screen.findAllByRole('heading', { name: 'Hạng mới', level: 2 })).toHaveLength(2);
    expect(screen.getByText('Nạp tiền hợp lệ')).toBeInTheDocument();
    expect(screen.queryByText('Chi tiêu hợp lệ')).not.toBeInTheDocument();
  });
  it('does not display a fabricated active card or threshold for disabled policy', async () => {
    mocks.mine.mockResolvedValue({ policy: { enabled: false, currency: 'VND', tiers: [{ code: 'member', name: { vi: 'Member', en: 'Member' }, threshold: 0, benefits: [] }] },
      evaluation: { status: 'disabled', tier: null, qualifyingAmountMinor: null }, legacyPurchasedAccessPreserved: true });
    render(<MemoryRouter><MembershipCardsPage /></MemoryRouter>);
    await screen.findByText('Chính sách thẻ chưa được áp dụng');
    expect(screen.getByText('Ngưỡng xét hạng chưa được áp dụng')).toBeInTheDocument();
    expect(screen.getByText('Quyền học đã mua được giữ nguyên.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Billing' })).toHaveAttribute('href', '/billing');
  });
});
