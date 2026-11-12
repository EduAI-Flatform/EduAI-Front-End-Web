import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MembershipCardsPage } from './MembershipCardsPage';
const mocks = vi.hoisted(() => ({ mine: vi.fn() }));
vi.mock('../../services/membership-cards.service', () => ({ membershipCardsService: mocks }));
describe('membership card page', () => {
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
