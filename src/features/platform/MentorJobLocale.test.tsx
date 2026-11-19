import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlatformProvider, usePlatform } from './PlatformProvider';
import { InstructorMentorSettingsPage } from '../mentors/InstructorMentorSettingsPage';
import { AdminMentorApprovalPage } from '../mentors/AdminMentorApprovalPage';
import { AdminJobManagementPage } from '../dashboard/AdminDashboard/AdminJobManagementPage';

const mocks = vi.hoisted(() => ({ getMine: vi.fn(), updateMine: vi.fn(), setActive: vi.fn(), mentors: vi.fn(), setApproval: vi.fn(), jobs: vi.fn(), publish: vi.fn(), remove: vi.fn() }));
vi.mock('../../services/api-client', async original => ({ ...(await original<typeof import('../../services/api-client')>()), apiClient: { get: vi.fn().mockResolvedValue({ settings: {} }) } }));
vi.mock('../../services/mentor.service', () => ({ mentorService: { getMine: mocks.getMine, updateMine: mocks.updateMine, setActive: mocks.setActive }, adminMentorService: { list: mocks.mentors, setApproval: mocks.setApproval } }));
vi.mock('../../services/job.service', async original => ({ ...(await original<typeof import('../../services/job.service')>()), adminJobService: { list: mocks.jobs, publish: mocks.publish, remove: mocks.remove } }));
const statuses = ['pending', 'approved', 'rejected'] as const;
const mentor = (status: string) => ({ id: status, status, isActive: false, headline: `Authored headline ${status}`, bio: 'Authored bio', timezone: 'UTC', expertise: [{ name: 'Authored expertise' }], availability: [{ dayOfWeek: 1, startMinute: 540, endMinute: 600 }], user: { fullName: `Authored mentor ${status}` } });
const jobs = ['draft', 'published', 'closed'].map(status => ({ id: status, status, title: `Authored job ${status}`, companyName: 'Authored company', summary: 'Authored summary', description: 'Authored description', location: 'Authored location', workMode: 'hybrid', employmentType: 'full_time', requiredSkills: [] }));
function Switch() { const { locale, setLocale } = usePlatform(); return <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>Switch</button>; }
const toggle = () => fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); document.documentElement.lang = 'vi'; mocks.getMine.mockResolvedValue(mentor('pending')); mocks.updateMine.mockResolvedValue(mentor('pending')); mocks.mentors.mockResolvedValue({ items: statuses.map(mentor) }); mocks.jobs.mockResolvedValue({ items: jobs }); mocks.publish.mockResolvedValue({ ...jobs[0], status: 'published' }); });
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); document.documentElement.lang = 'vi'; });

it.each(statuses)('updates mentor %s and all weekday names while preserving schedule values and authored inputs', async status => {
  mocks.getMine.mockResolvedValue(mentor(status));
  const { container } = render(<PlatformProvider><Switch /><InstructorMentorSettingsPage /></PlatformProvider>);
  await screen.findByDisplayValue(`Authored headline ${status}`);
  for (const locale of ['vi', 'en', 'vi']) {
    if (locale === 'en' || document.documentElement.lang === 'en') toggle();
    const label = locale === 'vi' ? ({ pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Đã từ chối' } as const)[status] : ({ pending: 'Pending', approved: 'Approved', rejected: 'Rejected' } as const)[status];
    expect(container.querySelector('.mentor-status > strong')).toHaveTextContent(label);
    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(locale === 'vi' ? ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    expect(screen.getByRole('combobox')).toHaveValue('1');
    expect(screen.getByDisplayValue(`Authored headline ${status}`)).toBeInTheDocument(); expect(screen.getByDisplayValue('Authored expertise')).toBeInTheDocument();
  }
  fireEvent.submit(container.querySelector('form')!);
  await screen.findByRole('status');
  toggle(); expect(screen.getByRole('status')).toHaveTextContent('Profile saved and submitted for review.');
  toggle(); expect(screen.getByRole('status')).toHaveTextContent('Đã lưu và gửi hồ sơ để xét duyệt.');
  expect(mocks.updateMine).toHaveBeenCalledWith({ headline: `Authored headline ${status}`, bio: 'Authored bio', timezone: 'UTC', expertise: ['Authored expertise'], availability: [{ dayOfWeek: 1, startMinute: 540, endMinute: 600 }] });
});

it('updates mentor approval labels while preserving names and the canonical approval decision', async () => {
  const { container } = render(<PlatformProvider><Switch /><AdminMentorApprovalPage /></PlatformProvider>);
  await screen.findByText('Authored mentor pending');
  for (const locale of ['vi', 'en', 'vi']) {
    if (locale === 'en' || document.documentElement.lang === 'en') toggle();
    expect(Array.from(container.querySelectorAll('article > span')).map(element => element.textContent)).toEqual(locale === 'vi' ? ['Chờ duyệt', 'Đã duyệt', 'Đã từ chối'] : ['Pending', 'Approved', 'Rejected']);
    expect(screen.getByText('Authored mentor pending')).toBeVisible(); expect(screen.getByText('Authored headline rejected')).toBeVisible();
  }
  toggle(); fireEvent.click(within(container.querySelector('article')!).getByRole('button', { name: 'Approve' }));
  await waitFor(() => expect(mocks.setApproval).toHaveBeenCalledWith('pending', 'approved'));
});

it('updates job states and deletion confirmation without changing titles or publishing values', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const { container } = render(<PlatformProvider><Switch /><AdminJobManagementPage /></PlatformProvider>);
  await screen.findByText('Authored job draft');
  fireEvent.click(screen.getByRole('button', { name: /Authored job draft/ }));
  for (const locale of ['vi', 'en', 'vi']) {
    if (locale === 'en' || document.documentElement.lang === 'en') toggle();
    expect(Array.from(container.querySelectorAll('.admin-jobs__list em')).map(element => element.textContent)).toEqual(locale === 'vi' ? ['Bản nháp', 'Đã xuất bản', 'Đã đóng'] : ['Draft', 'Published', 'Closed']);
    expect(screen.getByDisplayValue('Authored job draft')).toBeInTheDocument(); expect(screen.getByDisplayValue('Authored company')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: locale === 'vi' ? 'Xóa' : 'Delete' }));
    expect(confirm).toHaveBeenLastCalledWith(locale === 'vi' ? 'Xóa cơ hội việc làm này?' : 'Delete this job opportunity?');
  }
  expect(mocks.remove).not.toHaveBeenCalled();
  toggle(); fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
  await waitFor(() => expect(mocks.publish).toHaveBeenCalledWith('draft'));
});
