import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CardServiceQuotas } from './CardServiceQuotas';
const api = vi.hoisted(() => ({ quotas: vi.fn() }));
vi.mock('../../services/membership-cards.service', () => ({ membershipCardsService: api }));
vi.mock('../platform/PlatformProvider', () => ({ usePlatform: () => ({ locale: 'en', t: (vi: string, en?: string) => en ?? vi }) }));

describe('own card quota facts', () => {
  it('uses card facts instead of the priority-selected independent quota', async () => {
    api.quotas.mockResolvedValue({ evaluatedAt: '2026-11-13T00:00:00Z', items: [{ source: 'independent', remaining: '999' }],
      cardItems: [{ code: 'AI_CHAT', displayName: 'Chat', source: 'card', unitLabel: 'request', valueType: 'METERED',
        resetPeriod: 'CALENDAR_MONTH', quota: '5', consumed: '2', remaining: '3', allowed: true,
        periodStartsAt: '2026-11-01T00:00:00Z', periodEndsAt: '2026-12-01T00:00:00Z' }] });
    render(<CardServiceQuotas />);
    const region = await screen.findByRole('region', { name: 'Your card service quotas' });
    expect(within(region).getByText('3')).toBeInTheDocument();
    expect(within(region).getByText('2')).toBeInTheDocument();
    expect(within(region).queryByText('999')).not.toBeInTheDocument();
    expect(within(region).getByText('Purchased service quotas and course access remain separate.')).toBeInTheDocument();
  });
  it('retries a read failure and keeps absent quota facts unavailable rather than zero', async () => {
    api.quotas.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ evaluatedAt: '2026-11-13T00:00:00Z' });
    render(<CardServiceQuotas />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await screen.findByText('Card quota information is not available yet.');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
  it('shows a valid empty card view without making quota claims about independent purchases', async () => {
    api.quotas.mockResolvedValue({ cardItems: [], evaluatedAt: '2026-11-13T00:00:00Z' });
    render(<CardServiceQuotas />);
    await screen.findByText('No current card quota is available.');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
