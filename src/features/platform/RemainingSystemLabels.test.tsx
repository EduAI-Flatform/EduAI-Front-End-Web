import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { PlatformProvider, usePlatform } from './PlatformProvider';
import { TmiRewardsPage } from '../dashboard/StudentDashboard/TmiRewardsPage/TmiRewardsPage';
import { AdminTmiManagementPage } from '../dashboard/AdminDashboard/AdminTmiManagementPage';
import { AdminScholarshipManagementPage } from '../dashboard/AdminDashboard/AdminScholarshipManagementPage';
import { JobsPage } from '../jobs/JobsPage';
import { JobDetailPage } from '../jobs/JobDetailPage';

const api = vi.hoisted(() => ({ rewards: vi.fn(), ledger: vi.fn(), campaigns: vi.fn(), applications: vi.fn(), jobs: vi.fn(), job: vi.fn() }));
vi.mock('../../services/api-client', async original => ({ ...await original<typeof import('../../services/api-client')>(), apiClient: { get: vi.fn().mockResolvedValue({ settings: {} }) } }));
vi.mock('../auth/auth-store', () => ({ useAuthSession: () => null }));
vi.mock('../../services/tmi.service', async original => ({ ...await original<typeof import('../../services/tmi.service')>(),
 tmiService: { listRewards: api.rewards, history: api.ledger, wallet: vi.fn().mockResolvedValue({ current: 120, earned: 120, spent: 0, expired: 0 }) },
 adminTmiService: { listRewards: api.rewards, listLedger: async () => page(await api.ledger()), listRedemptions: async () => page([]) } }));
vi.mock('../../services/scholarship.service', async original => ({ ...await original<typeof import('../../services/scholarship.service')>(), adminScholarshipService: { list: api.campaigns, applications: api.applications } }));
vi.mock('../../services/job.service', async original => ({ ...await original<typeof import('../../services/job.service')>(), jobService: { list: api.jobs, get: api.job } }));
function page<T>(items: T[]) { return { items, page: 1, pageSize: 20, total: items.length, totalPages: 1 }; }
function SwitchLocale() { const { locale, setLocale } = usePlatform(); return <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>Switch locale</button>; }
function show(content: React.ReactNode) { return render(<PlatformProvider><MemoryRouter initialEntries={['/jobs/job-1']}><SwitchLocale />{content}</MemoryRouter></PlatformProvider>); }
function switchLocale() { fireEvent.click(screen.getByRole('button', { name: 'Switch locale' })); }
beforeEach(() => {
 localStorage.clear(); document.documentElement.lang = 'vi'; vi.clearAllMocks();
 api.rewards.mockResolvedValue(page([]));
 api.ledger.mockResolvedValue([{ id: 'ledger-1', userId: 'earn', kind: 'earn', sourceType: 'platform_activity', amount: 120, adjustmentDirection: null, occurredAt: '2026-11-14T00:00:00Z' }, { id: 'ledger-2', userId: 'future-code', kind: 'future-kind', sourceType: 'future-source', amount: 10, adjustmentDirection: null, occurredAt: '2026-11-14T00:00:00Z' }]);
 const job = { id: 'job-1', title: 'Từ xa', companyName: 'Remote', summary: 'Authored summary', description: 'Authored description', location: '', workMode: 'remote', employmentType: 'full_time', requiredSkills: [], closesAt: null };
 api.jobs.mockResolvedValue(page([job, { ...job, id: 'job-2', title: 'Hybrid role', workMode: 'hybrid' }, { ...job, id: 'job-3', title: 'Office role', workMode: 'onsite' }, { ...job, id: 'job-4', title: 'Unknown role', workMode: 'future-mode' }, { ...job, id: 'job-5', title: 'Authored location', location: 'Từ xa' }])); api.job.mockResolvedValue(job);
 api.campaigns.mockResolvedValue(page([{ id: 'campaign-1', title: 'Nháp', description: 'Authored description', status: 'draft', benefitKind: 'fixed_credit', benefitValue: 100, applicationMode: 'application', currency: 'VND', quota: 10, awardedCount: 2, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-12-01T00:00:00Z', courseIds: [], categorySlugs: [], eligibleUserIds: [] }]));
 api.applications.mockResolvedValue(page([{ id: 'application-1', userId: 'pending', courseId: 'course_access', status: 'pending' }, { id: 'application-2', userId: 'future-status', courseId: 'fixed_credit', status: 'future-status' }]));
});
it.each(['student', 'admin'])('localizes %s ledger kinds and sources live without altering amounts or IDs', async surface => {
 const { container } = show(surface === 'student' ? <TmiRewardsPage /> : <AdminTmiManagementPage />);
 await screen.findByText('Tích lũy');
 expect(screen.getByText(/Hoạt động nền tảng/)).toBeVisible();
 expect(screen.getByText('Loại giao dịch khác')).toBeVisible(); expect(screen.getByText(/Nguồn khác/)).toBeVisible();
 const ledger = container.querySelector(surface === 'student' ? '.tmi-rewards__history' : '.admin-tmi-table-wrap')!;
 expect(ledger.textContent).toContain('120 GDS Point');
 switchLocale(); expect(within(ledger as HTMLElement).getByText('Earned')).toBeVisible(); expect(screen.getByText(/Platform activity/)).toBeVisible();
 expect(screen.getByText('Other transaction type')).toBeVisible(); expect(screen.getByText(/Other source/)).toBeVisible();
 expect(ledger.textContent).toContain('120 GDS Point');
 if (surface === 'admin') expect(within(ledger as HTMLElement).getByText('earn')).toBeVisible();
 switchLocale(); expect(screen.getByText('Tích lũy')).toBeVisible(); expect(api.ledger).toHaveBeenCalledTimes(1);
});
it('localizes campaign and application enums while preserving authored titles, descriptions and IDs', async () => {
 const { container } = show(<AdminScholarshipManagementPage />);
 const campaign = await screen.findByRole('button', { name: /Nháp/ }); fireEvent.click(campaign);
 await screen.findByRole('cell', { name: 'Chờ duyệt' });
 expect(campaign).toHaveTextContent('Tín dụng cố định'); expect(campaign.querySelector('em')).toHaveTextContent('Nháp');
 expect(screen.getByRole('cell', { name: 'Chưa rõ trạng thái' })).toBeVisible();
 switchLocale(); expect(campaign).toHaveTextContent('Fixed credit'); expect(campaign.querySelector('em')).toHaveTextContent('Draft');
 expect(screen.getByRole('cell', { name: 'Pending' })).toBeVisible(); expect(screen.getByRole('cell', { name: 'Unknown status' })).toBeVisible();
 expect(screen.getByRole('heading', { name: 'Nháp' })).toBeVisible(); expect(screen.getByDisplayValue('Authored description')).toBeVisible();
 expect(screen.getByRole('cell', { name: 'pending' })).toBeVisible(); expect(screen.getByRole('cell', { name: 'course_access' })).toBeVisible();
 expect(container.querySelector('.admin-scholarship-list')).toHaveTextContent('2/10');
 switchLocale(); expect(screen.getByRole('cell', { name: 'Chờ duyệt' })).toBeVisible(); expect(api.campaigns).toHaveBeenCalledTimes(1);
});
it('localizes only missing-location work modes in job cards and reacts to locale changes', async () => {
 const { container } = show(<JobsPage />); await screen.findByRole('heading', { name: 'Từ xa' });
 const locations = () => [...container.querySelectorAll('.job-card__location')].map(node => node.textContent);
 expect(locations()).toEqual(['Từ xa', 'Kết hợp', 'Tại văn phòng', 'Hình thức làm việc khác', 'Từ xa']);
 switchLocale(); expect(locations()).toEqual(['Remote', 'Hybrid', 'On-site', 'Other work arrangement', 'Từ xa']);
 expect(screen.getByRole('heading', { name: 'Từ xa' })).toBeVisible(); switchLocale(); expect(locations()[0]).toBe('Từ xa'); expect(api.jobs).toHaveBeenCalledTimes(1);
});
it('localizes the job detail fallback live while retaining authored content', async () => {
 const { container } = show(<Routes><Route path='/jobs/:jobId' element={<JobDetailPage />} /></Routes>);
 await screen.findByRole('heading', { name: 'Từ xa' });
 expect(container.querySelector('header span')).toHaveTextContent('Từ xa'); switchLocale(); expect(container.querySelector('header span')).toHaveTextContent('Remote');
 expect(screen.getByRole('heading', { name: 'Từ xa' })).toBeVisible(); expect(screen.getByText('Authored description')).toBeVisible();
 switchLocale(); expect(container.querySelector('header span')).toHaveTextContent('Từ xa'); expect(api.job).toHaveBeenCalledTimes(1);
});
it.each(['student', 'admin'])('localizes %s reward kinds and admin statuses live while retaining authored titles and descriptions', async surface => {
 const kinds = ['course_access', 'voucher', 'gift', 'digital', 'physical', 'future-kind'];
 const statuses = ['draft', 'active', 'disabled', 'expired', 'future-status', 'future-status'];
 api.rewards.mockResolvedValue(page(kinds.map((kind, index) => ({ id: 'reward-' + index, title: index ? 'Reward ' + index : 'Quà tặng', description: 'Quyền truy cập khóa học', kind, status: statuses[index], cost: 40, quota: 10, redeemedCount: 0, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-12-01T00:00:00Z', inventoryMetadata: null }))));
 const { container } = show(surface === 'student' ? <TmiRewardsPage /> : <AdminTmiManagementPage />);
 await screen.findByText('Quà tặng', { selector: surface === 'student' ? 'h3' : 'strong' });
 const kindsRendered = () => [...container.querySelectorAll(surface === 'student' ? '.tmi-rewards__reward-kind' : '.admin-tmi-list__item small')].map(node => node.textContent?.split(' · ').at(-1));
 expect(kindsRendered()).toEqual(['Quyền truy cập khóa học', 'Mã ưu đãi', 'Quà tặng', 'Quà số', 'Quà tặng', 'Phần thưởng khác']);
 if (surface === 'admin') expect([...container.querySelectorAll('.admin-tmi-status')].map(node => node.textContent)).toEqual(['Nháp', 'Đang bật', 'Đã tắt', 'Đã hết hạn', 'Chưa rõ trạng thái', 'Chưa rõ trạng thái']);
 switchLocale();
 expect(kindsRendered()).toEqual(['Course access', 'Voucher', 'Gift', 'Digital gift', 'Physical gift', 'Other reward']);
 if (surface === 'admin') expect([...container.querySelectorAll('.admin-tmi-status')].map(node => node.textContent)).toEqual(['Draft', 'Active', 'Disabled', 'Expired', 'Unknown status', 'Unknown status']);
 expect(screen.getByText('Quà tặng', { selector: surface === 'student' ? 'h3' : 'strong' })).toBeVisible();
 if (surface === 'student') expect(screen.getAllByText('Quyền truy cập khóa học', { selector: 'p' })).toHaveLength(6);
 expect(container.querySelector(surface === 'student' ? '.tmi-rewards__reward-meta strong' : '.admin-tmi-list__item small')).toHaveTextContent('40 GDS Point');
 switchLocale(); expect(kindsRendered()[0]).toBe('Quyền truy cập khóa học'); expect(api.rewards).toHaveBeenCalledTimes(1);
});
