import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PointImpactPanel } from './PointImpactPanel';

const language = vi.hoisted(() => ({ locale: 'vi' }));
vi.mock('./PlatformProvider', () => ({ usePlatform: () => ({ locale: language.locale,
  t: (viText: string, enText: string) => language.locale === 'en' ? enText : viText }) }));
const impact = { status: 'evaluated' as const, simulationOnly: true as const, historicalAwardsPreserved: true as const,
  reprocessesHistoricalEvents: false as const, windowStart: '2026-10-13T12:00:00Z', windowEnd: '2026-11-12T12:00:00Z',
  sampleLimit: 5000, sampledEvents: 3, sampledLearners: 2, affectedLearners: 1, changedEvents: 1,
  beforePoints: 180, afterPoints: 200, beforeRevisionId: 'old-revision', afterRevisionId: 'draft-revision' };
afterEach(() => { cleanup(); language.locale = 'vi'; });
describe('point policy impact panel', () => {
  it('shows the sample, changed learners, amounts and revision provenance', () => {
    render(<PointImpactPanel impact={impact} />);
    expect(screen.getByRole('heading', { name: 'Mô phỏng chính sách điểm' })).toBeInTheDocument();
    expect(screen.getByText(/Điểm theo chính sách hiện tại: 180/)).toBeInTheDocument();
    expect(screen.getByText(/Điểm theo bản nháp: 200/)).toBeInTheDocument();
    expect(screen.getByText(/Người học có kết quả thay đổi: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Không cộng lại điểm cũ/)).toBeInTheDocument();
    expect(screen.getByText('old-revision')).toBeInTheDocument();
    expect(screen.getByText('draft-revision')).toBeInTheDocument();
  });
  it('does not present a truncated dataset as zero or a complete projection', () => {
    render(<PointImpactPanel impact={{ ...impact, status: 'limit_exceeded', sampledEvents: null, sampledLearners: null,
      affectedLearners: null, changedEvents: null, beforePoints: null, afterPoints: null }} />);
    expect(screen.getByText(/Vượt giới hạn/)).toBeInTheDocument();
    expect(screen.queryByText(/Điểm theo bản nháp:/)).not.toBeInTheDocument();
  });
  it('renders English explanations and an explicit empty sample state', () => {
    language.locale = 'en';
    render(<PointImpactPanel impact={{ ...impact, sampledEvents: 0, sampledLearners: 0, affectedLearners: 0,
      changedEvents: 0, beforePoints: 0, afterPoints: 0 }} />);
    expect(screen.getByRole('heading', { name: 'Point policy simulation' })).toBeInTheDocument();
    expect(screen.getByText(/No completed courses in this sample window/)).toBeInTheDocument();
    expect(screen.getByText(/Historical awards are not recalculated/)).toBeInTheDocument();
  });
});
