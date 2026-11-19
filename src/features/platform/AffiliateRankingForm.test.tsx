import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useState } from 'react';
import { AffiliateRankingForm } from './AffiliateRankingForm';
import { DEFAULT_AFFILIATE_RANKING } from './platform.defaults';
vi.mock('./PlatformProvider', () => ({ usePlatform: () => ({ t: (_vi: string, en: string) => en }) }));
it('requires explicit supported reporting choices without changing financial gates', () => {
  function Form() { const [value, change] = useState<unknown>(DEFAULT_AFFILIATE_RANKING); return <AffiliateRankingForm value={value} onChange={change} />; }
  render(<Form />);
  expect(screen.getByRole('checkbox')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Ranking basis'), { target: { value: 'recorded_referral_count' } });
  fireEvent.change(screen.getByLabelText('Ranking period'), { target: { value: 'lifetime' } });
  expect(screen.getByRole('checkbox')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Tie policy'), { target: { value: 'competition' } });
  expect(screen.getByRole('checkbox')).toBeEnabled();
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(screen.getByText(/independent of affiliate admission/)).toBeInTheDocument();
});
