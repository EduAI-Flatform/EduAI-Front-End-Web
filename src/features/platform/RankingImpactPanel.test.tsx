import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { RankingImpactPanel } from './RankingImpactPanel';
import type { RankingImpact } from '../../services/platform-settings.service';
const state = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('./PlatformProvider', () => ({ usePlatform: () => ({ locale: state.locale, t: (vi: string, en: string) => state.locale === 'en' ? en : vi }) }));
const impact: RankingImpact = { beforeRevisionId: 'before-rev', afterRevisionId: 'after-rev', asOf: '2030-03-01T12:00:00.000Z', timeZone: 'UTC', examinedParticipants: 3, newlyRanked: 3, removedParticipants: 0, changedRanks: 0, unchangedRanks: 0, complete: true, comparable: true, exceptions: [], activationReady: true, activationBlockers: [] };
it('distinguishes newly ranked from ordinal change and shows paired provenance', () => {
  render(<RankingImpactPanel impact={impact} />);
  expect(screen.getByText('Newly ranked: 3')).toBeInTheDocument();
  expect(screen.getByText('Changed ranks: 0')).toBeInTheDocument();
  expect(screen.getByText('before-rev')).toBeInTheDocument(); expect(screen.getByText('after-rev')).toBeInTheDocument();
});
it.each(['constructor', '__proto__', 'toString'])('renders safe fallback for inherited blocker name %s', reason => {
  const { container } = render(<RankingImpactPanel impact={{ ...impact, activationReady: false, activationBlockers: [reason] }} />);
  expect(screen.getByText('Complete valid data is unavailable to determine a rank.')).toBeInTheDocument();
  expect(container).not.toHaveTextContent(reason);
  expect(screen.getByText('Newly ranked: 3')).toBeInTheDocument();
});
it('never converts incomplete unknown totals to zero and localizes exceptions live', () => {
  const { container, rerender } = render(<RankingImpactPanel impact={{ ...impact, comparable: false, complete: false, activationReady: false, newlyRanked: null, exceptions: [{ side: 'before', reason: 'RANKING_SOURCE_SCAN_LIMIT_EXCEEDED', count: 1 }] }} />);
  expect(screen.getByText('Newly ranked: Unknown')).toBeInTheDocument();
  expect(screen.getByText(/Before policy: Recorded sources exceed/)).toBeInTheDocument();
  expect(container).not.toHaveTextContent('RANKING_SOURCE_SCAN_LIMIT_EXCEEDED');
  state.locale = 'vi'; rerender(<RankingImpactPanel impact={impact} />);
  expect(screen.getByText('Mới được xếp hạng: 3')).toBeInTheDocument(); state.locale = 'en';
});
