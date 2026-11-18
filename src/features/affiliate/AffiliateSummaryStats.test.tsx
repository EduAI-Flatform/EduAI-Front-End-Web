import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AffiliateSummaryStats } from './AffiliateSummaryStats';
import { PlatformProvider, usePlatform } from '../platform/PlatformProvider';

vi.mock('../../services/api-client', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ settings: {} }) } }));
afterEach(() => { localStorage.clear(); document.documentElement.lang = 'vi'; });
const summary = {
  asOf: '2030-03-01T12:00:00.000Z', timeZone: 'UTC', currency: 'VND', commissionBasis: 'recorded_signed_accruals',
  lifetimeCommissionMinor: '120', commissionStatus: 'available', commissionReason: null,
  today: { startsAt: '2030-03-01T00:00:00.000Z', endsBefore: '2030-03-01T12:00:00.000Z', amountMinor: '-30' },
  month: { startsAt: '2030-03-01T00:00:00.000Z', endsBefore: '2030-03-01T12:00:00.000Z', amountMinor: '0' },
  revenue: { status: 'available', amountMinor: '9007199254740993', basis: 'net_verified_paid_after_recorded_refunds', complete: true, reason: null },
  ranking: { status: 'unconfigured', value: null, reason: 'RANKING_POLICY_NOT_CONFIGURED' },
  subAffiliates: { status: 'disabled', count: null, reason: 'SUB_AFFILIATE_POLICY_NOT_ENABLED' },
} as const;
function Switch() { const { locale, setLocale } = usePlatform(); return <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>Switch</button>; }

it('renders signed exact amounts, genuine zero, policy states and UTC metadata in both languages', () => {
  localStorage.clear();
  const { container } = render(<PlatformProvider><Switch /><AffiliateSummaryStats summary={summary} /></PlatformProvider>);
  for (const locale of ['vi', 'en', 'vi']) {
    if (locale === 'en' || document.documentElement.lang === 'en') fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
    const formatted = (value: string) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(BigInt(value));
    expect(container.querySelector('[data-affiliate-summary="revenue"] strong')?.textContent).toBe(formatted('9007199254740993'));
    expect(container.querySelector('[data-affiliate-summary="today"] strong')?.textContent).toBe(formatted('-30'));
    expect(container.querySelector('[data-affiliate-summary="month"] strong')?.textContent).toBe(formatted('0'));
    expect(screen.getByText(locale === 'vi' ? 'Chưa cấu hình' : 'Unconfigured')).toBeInTheDocument();
    expect(screen.getByText(locale === 'vi' ? 'Chưa bật' : 'Disabled')).toBeInTheDocument();
    expect(container).toHaveTextContent('UTC');
    expect(container.querySelector('time')).toHaveAttribute('dateTime', summary.asOf);
  }
});

it('does not substitute zero or a partial amount when source or summary is unavailable', () => {
  localStorage.clear();
  const { rerender, container } = render(<PlatformProvider><AffiliateSummaryStats /></PlatformProvider>);
  expect(container.querySelectorAll('[data-affiliate-summary] strong')).toHaveLength(5);
  expect(container).not.toHaveTextContent('₫');
  rerender(<PlatformProvider><AffiliateSummaryStats summary={{ ...summary, revenue: { ...summary.revenue, complete: false, status: 'unavailable', reason: 'SOURCE_SCAN_LIMIT_EXCEEDED' }, commissionStatus: 'unavailable' }} /></PlatformProvider>);
  expect(container).not.toHaveTextContent('₫');
});

it('rejects invalid snapshot, period and amount metadata without displaying misleading money', () => {
  const { rerender, container } = render(<PlatformProvider><AffiliateSummaryStats summary={{ ...summary, asOf: 'invalid' }} /></PlatformProvider>);
  expect(container.querySelector('time')).toBeNull();
  expect(container).not.toHaveTextContent('₫');
  rerender(<PlatformProvider><AffiliateSummaryStats summary={{ ...summary,
    revenue: { ...summary.revenue, amountMinor: '-1' },
    today: { ...summary.today, startsAt: '2030-02-28T00:00:00.000Z' },
    month: { ...summary.month, amountMinor: 'NaN' },
  }} /></PlatformProvider>);
  expect(container).not.toHaveTextContent('₫');
});
