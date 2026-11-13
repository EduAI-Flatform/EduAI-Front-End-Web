import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CardServiceBindingIssues, ServiceQuotaImpact } from './ServiceQuotaImpact';
import { MembershipImpactPanel } from './MembershipImpactPanel';
import type { MembershipImpact } from '../../services/platform-settings.service';
const quota = { definitionId: 'service', code: 'AI_CHAT', resetPeriod: 'calendar_month', quota: '5', consumed: '2', remaining: '3',
  overLimit: false, periodStartsAt: '2026-11-01T00:00:00Z', periodEndsAt: '2026-12-01T00:00:00Z' };
vi.mock('./PlatformProvider', () => ({ usePlatform: () => ({ locale: 'en', t: (vi: string, en?: string) => en ?? vi }) }));
describe('consumed quota comparison', () => {
  it('explains unbound service rules without displaying an executable configuration', () => {
    render(<CardServiceBindingIssues issues={[{ definitionId: 'missing-service', reason: 'CARD_SERVICE_OPERATION_NOT_BOUND' }]} />);
    expect(screen.getByRole('region', { name: 'Quota configuration needs attention' })).toHaveTextContent('missing-service');
    expect(screen.getByRole('listitem')).toHaveTextContent('The service is not bound to an executable operation.');
  });
  it('shows consumed usage unchanged when a lower quota leaves zero available', () => {
    render(<ServiceQuotaImpact before={[quota]} after={[{ ...quota, quota: '1', remaining: '0', overLimit: true }]} />);
    expect(within(screen.getByRole('group', { name: 'Before' })).getByText('3')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'After' })).getByText('0')).toBeInTheDocument();
    expect(screen.getAllByText('2')).toHaveLength(2);
    expect(screen.getByText('Recorded usage exceeds the new quota. No history is deleted.')).toBeInTheDocument();
  });
  it('does not present missing projections as zero balances', () => {
    render(<ServiceQuotaImpact before={null} after={null} />);
    expect(screen.getByText('Remaining quota cannot be projected from the available data.')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
  it('identifies a removed card quota without implying purchased rights were removed', () => {
    render(<ServiceQuotaImpact before={[quota]} after={[]} />);
    expect(within(screen.getByRole('group', { name: 'After' })).getByText('No card quota')).toBeInTheDocument();
    expect(screen.getByText('Purchased service quotas and course access remain separate.')).toBeInTheDocument();
  });
  it('shows paged consumed-quota impact without treating a partial page as a complete forecast', () => {
    const impact: MembershipImpact = { status: 'evaluated', reason: null, policyRevisionId: 'revision',
      evaluatedUsers: 1, totalUsers: 2, nextCursor: 'owner', complete: false, serviceConsumptionProjected: true,
      projectedServiceRemainingChangesOnPage: 1, items: [{ userId: 'owner', previousTierCode: 'member',
        previousServiceQuota: [quota], projectedServiceQuota: [{ ...quota, quota: '1', remaining: '0', overLimit: true }],
        evaluation: { status: 'evaluated', reason: null, policyRevisionId: 'revision', currency: 'VND',
          tier: null, qualifyingAmountMinor: '0', windowStartsAt: null, windowEndsAt: null, evaluatedAt: null } }] };
    render(<MembershipImpactPanel initial={impact} />);
    expect(screen.getByText('Projected remaining-quota changes on this page: 1')).toBeInTheDocument();
    expect(screen.getByText('This is a partial snapshot, not a complete forecast. Review remaining pages and unavailable data.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Service quota impact' })).toBeInTheDocument();
  });
  it('explains incomplete simulation without crashing on an unavailable response with no rows', () => {
    const impact: MembershipImpact = { status: 'unavailable', reason: 'CARD_SERVICE_USAGE_SCAN_LIMIT_EXCEEDED',
      policyRevisionId: 'revision', nextCursor: null, complete: false, serviceConsumptionProjected: false,
      serviceConsumptionProjectionIssues: [{ reason: 'CARD_SERVICE_USAGE_SCAN_LIMIT_EXCEEDED' }], items: [] };
    Reflect.deleteProperty(impact, 'items');
    render(<MembershipImpactPanel initial={impact} />);
    expect(screen.getByText('Verified data is insufficient for a complete simulation.')).toBeInTheDocument();
    expect(screen.getByText('Usage history exceeds the preview read limit. A complete projection is unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('Projected remaining-quota changes on this page: 0')).not.toBeInTheDocument();
  });
});
