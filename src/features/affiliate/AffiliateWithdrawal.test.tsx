import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AffiliateWithdrawal } from './AffiliateWithdrawal';
import { gdsWalletService } from '../../services/gds-wallet.service';
vi.mock('../wallet/GdsWithdrawalPanel', () => ({ GdsWithdrawalPanel: ({ summary, onChanged }: any) =>
  <div><span>{summary.balance.availableMinor}</span><button onClick={onChanged}>withdraw changed</button></div> }));
vi.mock('../platform/PlatformProvider', () => ({ usePlatform: () => ({ t: (vi: string) => vi }) }));
afterEach(() => vi.restoreAllMocks());
describe('affiliate withdrawal reuses the existing GDS flow', () => {
  it('uses the authoritative GDS summary and refreshes the affiliate after a withdrawal', async () => {
    const summary = vi.spyOn(gdsWalletService, 'summary').mockResolvedValue({ balance: { availableMinor: '250000' } } as any);
    const changed = vi.fn(); render(<AffiliateWithdrawal onChanged={changed} />);
    expect(await screen.findByText('250000')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'withdraw changed' }));
    await waitFor(() => expect(summary).toHaveBeenCalledTimes(2)); expect(changed).toHaveBeenCalledOnce();
  });
  it('shows a recoverable error instead of fabricating a zero balance', async () => {
    vi.spyOn(gdsWalletService, 'summary').mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ balance: { availableMinor: '300000' } } as any);
    render(<AffiliateWithdrawal onChanged={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được ví GDS.');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('300000')).toBeVisible();
  });
});
