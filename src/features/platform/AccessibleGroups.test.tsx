import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PlatformProvider, usePlatform } from './PlatformProvider';
import { CareerProfileSection } from '../dashboard/StudentDashboard/StudentProfilePage/CareerProfileSection';
import { CourseManagementFilters } from '../dashboard/InstructorDashboard/InstructorCourseManagementPage/CourseManagementFilters/CourseManagementFilters';

vi.mock('../../services/api-client', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ settings: {} }) } }));
function Switch() { const { locale, setLocale } = usePlatform(); return <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>Switch</button>; }
afterEach(() => { localStorage.clear(); document.documentElement.lang = 'vi'; });

it('exposes achievements and status controls as named groups in both languages', () => {
  localStorage.clear(); document.documentElement.lang = 'vi';
  const changeStatus = vi.fn();
  render(<PlatformProvider><Switch />
    <CareerProfileSection profile={null} isLoading={false} onSave={vi.fn()} />
    <CourseManagementFilters search='' status='all' onSearchChange={vi.fn()} onStatusChange={changeStatus} />
  </PlatformProvider>);
  for (const locale of ['vi', 'en', 'vi']) {
    if (locale === 'en' || document.documentElement.lang === 'en') fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
    const achievements = screen.getByRole('group', { name: locale === 'vi' ? 'Thành tựu đã xác minh' : 'Verified achievements' });
    expect(achievements).toHaveTextContent('0');
    const filters = screen.getByRole('group', { name: locale === 'vi' ? 'Lọc theo trạng thái' : 'Filter by status' });
    expect(within(filters).getAllByRole('button')).toHaveLength(4);
    fireEvent.click(within(filters).getAllByRole('button')[1]);
    expect(changeStatus).toHaveBeenLastCalledWith('draft');
  }
});
