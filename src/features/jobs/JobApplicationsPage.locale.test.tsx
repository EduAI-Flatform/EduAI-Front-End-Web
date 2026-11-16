import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PlatformProvider, usePlatform } from '../platform/PlatformProvider';
import { JobApplicationsPage } from './JobApplicationsPage';
import { AdminJobApplicationsPage } from './AdminJobApplicationsPage';
const statuses = ['submitted', 'reviewing', 'shortlisted', 'accepted', 'rejected', 'withdrawn'];
const items = statuses.map(status => ({ id: status, status, history: [], job: { title: 'Trạng thái', companyName: 'Lưu' } }));
vi.mock('../../services/job.service', () => ({ jobService: { listApplications: async () => ({ items }), listSaved: async () => ({ items: [] }) }, adminJobService: { listApplications: async () => ({ items }) }, getJobError: String }));
vi.mock('../../services/api-client', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ settings: {} }) } }));
function Switch() { const { setLocale } = usePlatform(); return <button onClick={() => setLocale('en')}>switch</button>; }
beforeEach(() => localStorage.setItem('gds.locale.v1', 'vi'));
describe('application system labels', () => {
  it.each([JobApplicationsPage, AdminJobApplicationsPage])('localizes every status and preserves authored names', async Page => {
    render(<PlatformProvider><MemoryRouter><Switch /><Page /></MemoryRouter></PlatformProvider>);
    await screen.findAllByText('Trạng thái', { selector: 'h3' });
    for (const label of ['Đã gửi', 'Đang xem xét', 'Vào danh sách chọn', 'Đã chấp nhận', 'Đã từ chối', 'Đã rút']) expect(screen.getAllByText(label, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.queryByText('submitted')).not.toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'switch' }).click());
    for (const label of ['Submitted', 'Reviewing', 'Shortlisted', 'Accepted', 'Rejected', 'Withdrawn']) expect(screen.getAllByText(label, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Trạng thái', { selector: 'h3' })).toHaveLength(6);
    if (Page === AdminJobApplicationsPage) expect(within(screen.getAllByRole('combobox')[0]).getByRole('option', { name: 'Reviewing' })).toHaveValue('reviewing');
  });
});
