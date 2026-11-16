import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PlatformProvider, usePlatform } from '../../../../platform/PlatformProvider';
import { InstructorCourseList } from './InstructorCourseList';
import type { CourseSummary } from '../../../../../services/course.service';
vi.mock('../../../../../services/api-client', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ settings: {} }) } }));
function Switch() { const { setLocale } = usePlatform(); return <button onClick={() => setLocale('en')}>switch</button>; }
it('reformats an already rendered course date when locale changes', () => {
  localStorage.setItem('gds.locale.v1', 'vi');
  const updatedAt = '2026-01-23T12:00:00Z';
  render(<PlatformProvider><MemoryRouter><Switch /><InstructorCourseList courses={[{ id: 'course', title: 'Tên riêng', updatedAt, status: 'draft', visibility: 'private', description: '' } as CourseSummary]} error={null} isLoading={false} mutatingCourseId={null} onArchive={() => {}} onEdit={() => {}} onPublish={() => {}} onPageChange={() => {}} pagination={{ page: 1, pageSize: 20, total: 1, totalPages: 1 }} /></MemoryRouter></PlatformProvider>);
  const format = (locale: string) => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(updatedAt));
  expect(screen.getByText((_, node) => node?.tagName === 'SPAN' && node.textContent?.includes(format('vi-VN')) === true)).toBeInTheDocument();
  act(() => screen.getByRole('button', { name: 'switch' }).click());
  expect(screen.getByText((_, node) => node?.tagName === 'SPAN' && node.textContent?.includes(format('en-US')) === true)).toBeInTheDocument();
});
