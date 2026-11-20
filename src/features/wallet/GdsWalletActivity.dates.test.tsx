import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GdsWalletActivity } from './GdsWalletActivity';
import { gdsWalletService } from '../../services/gds-wallet.service';
import { ApiClientError } from '../../services/api-client';
vi.mock('../platform/PlatformProvider', () => ({ usePlatform: () => ({ t: (_vi: string, en: string) => en, locale: 'en' }) }));
afterEach(() => vi.restoreAllMocks());
it('uses the same date range for the visible history and full export', async () => {
  const list = vi.spyOn(gdsWalletService, 'transactions').mockResolvedValue({ items: [{ id: 'row', type: 'TOPUP_CREDIT', amountMinor: '5000', occurredAt: '2026-11-15T00:00:00Z' }], hasMore: false, nextCursor: null });
  const download = vi.spyOn(gdsWalletService, 'exportTransactions').mockRejectedValue(new ApiClientError('failed', 'FAILED', 500));
  render(<GdsWalletActivity />);
  await waitFor(() => expect(list).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-11-01' } });
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-11-20' } });
  await waitFor(() => expect(list).toHaveBeenLastCalledWith('all', undefined, { startDate: '2026-11-01', endDate: '2026-11-20' }));
  const button = screen.getByRole('button', { name: 'Export Excel for this filter' });
  await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button);
  await waitFor(() => expect(download).toHaveBeenCalledWith('all', { startDate: '2026-11-01', endDate: '2026-11-20' }));
});
it('does not request an inverted date range', async () => {
  const list = vi.spyOn(gdsWalletService, 'transactions').mockResolvedValue({ items: [], hasMore: false, nextCursor: null });
  render(<GdsWalletActivity />); await waitFor(() => expect(list).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-11-20' } });
  await waitFor(() => expect(list).toHaveBeenLastCalledWith('all', undefined, { startDate: '2026-11-20', endDate: '' }));
  const count = list.mock.calls.length;
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-11-01' } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Start date must not follow end date.');
  expect(list).toHaveBeenCalledTimes(count);
});
