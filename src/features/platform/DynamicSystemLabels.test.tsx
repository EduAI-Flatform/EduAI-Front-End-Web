import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider, usePlatform } from './PlatformProvider';
import { AdminPlatformSettingsPage } from './AdminPlatformSettingsPage';
import { AffiliatePage } from '../affiliate/AffiliatePage';
import { DEFAULT_PLATFORM_SETTINGS } from './platform.defaults';

const api = vi.hoisted(() => ({ state: vi.fn(), list: vi.fn(), policyState: vi.fn() }));
vi.mock('../../services/api-client', async importOriginal => ({ ...await importOriginal<typeof import('../../services/api-client')>(),
  apiClient: { get: vi.fn().mockResolvedValue({ settings: {} }) } }));
vi.mock('../../services/platform-settings.service', () => ({ platformSettingsService: { state: api.policyState } }));
vi.mock('../../services/affiliate.service', () => ({ affiliateService: { state: api.state, list: api.list } }));
vi.mock('../auth/auth-store', () => ({ useAuthSession: () => ({ user: { roles: ['instructor'] } }) }));
function SwitchLocale() {
  const { locale, setLocale } = usePlatform();
  return <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>Switch locale</button>;
}
function show(content: React.ReactNode) { return render(<PlatformProvider><MemoryRouter><SwitchLocale />{content}</MemoryRouter></PlatformProvider>); }
beforeEach(() => {
  localStorage.clear(); document.documentElement.lang = 'vi';
  api.policyState.mockResolvedValue({ settings: DEFAULT_PLATFORM_SETTINGS, groups: Object.keys(DEFAULT_PLATFORM_SETTINGS), versions: {},
    revisions: ['draft', 'approved', 'scheduled', 'cancelled', 'future-status'].map((status, index) => ({ id: String(index), group: 'branding',
      content: DEFAULT_PLATFORM_SETTINGS.branding, version: index + 1, status, createdAt: '2026-11-14T00:00:00Z', createdById: 'Bản nháp' })) });
  api.state.mockResolvedValue({ enabled: false, totalReferrals: 2, identities: [], accruedAmountMinor: '0', availableBalanceMinor: null });
  api.list.mockResolvedValue({ page: 1, totalPages: 1, items: ['general', 'instructor'].map((kind, index) => ({ id: String(index), kind,
    userName: index ? 'Giảng viên' : 'Thông thường', orderNumber: 'GDS-' + index, accruedAmountMinor: '15000', createdAt: '2026-11-14T00:00:00Z' })) });
});

describe('dynamic system enum localization', () => {
  it('updates policy revision statuses both ways while preserving creator IDs and unknown codes', async () => {
    const { container } = show(<AdminPlatformSettingsPage />);
    await screen.findByRole('button', { name: /v1/ });
    const labels = () => [...container.querySelectorAll('.platform-settings__revision strong')].map(node => node.textContent);
    expect(labels()).toEqual(['v1 · Bản nháp', 'v2 · Đã duyệt', 'v3 · Đã đặt lịch', 'v4 · Đã hủy', 'v5 · future-status']);
    fireEvent.click(screen.getByRole('button', { name: 'Switch locale' }));
    expect(labels()).toEqual(['v1 · Draft', 'v2 · Approved', 'v3 · Scheduled', 'v4 · Cancelled', 'v5 · future-status']);
    expect(container.querySelector('.platform-settings__revision small')).toHaveTextContent('Created by: Bản nháp');
    fireEvent.click(screen.getByRole('button', { name: 'Switch locale' }));
    expect(labels()[0]).toBe('v1 · Bản nháp');
  });
  it('updates referral kinds without translating identically named users or changing amount values', async () => {
    const { container } = show(<AffiliatePage />);
    await screen.findByRole('heading', { name: 'Thông tin referral' });
    fireEvent.click(screen.getByRole('button', { name: 'Hiệu quả tiếp thị liên kết' }));
    const records = () => [...container.querySelectorAll('.affiliate-page__records article')];
    expect(within(records()[0] as HTMLElement).getByText('GDS-0 · Thông thường')).toBeVisible();
    expect(within(records()[1] as HTMLElement).getByText('GDS-1 · Giảng viên')).toBeVisible();
    expect(within(records()[0] as HTMLElement).getByText(/^Hoa hồng ghi nhận/).textContent?.replace(/\D/g, '')).toBe('15000');
    fireEvent.click(screen.getByRole('button', { name: 'Switch locale' }));
    expect(within(records()[0] as HTMLElement).getByText('GDS-0 · General')).toBeVisible();
    expect(within(records()[1] as HTMLElement).getByText('GDS-1 · Instructor')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Thông thường' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Giảng viên' })).toBeVisible();
    expect(within(records()[0] as HTMLElement).getByText(/^Accrued commission/).textContent?.replace(/\D/g, '')).toBe('15000');
    fireEvent.click(screen.getByRole('button', { name: 'Switch locale' }));
    expect(within(records()[0] as HTMLElement).getByText('GDS-0 · Thông thường')).toBeVisible();
    expect(api.list).toHaveBeenCalledTimes(1);
  });
});
