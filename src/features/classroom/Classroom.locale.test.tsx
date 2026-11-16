import { act, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PlatformProvider, usePlatform } from '../platform/PlatformProvider';
import { ClassroomDashboard } from './ClassroomDashboard';
import { ClassroomJoinPage } from './ClassroomJoinPage';
const start = '2026-01-23T12:00:00Z', end = '2026-01-23T13:00:00Z';
const session = { id: 'session', title: 'Tên buổi học', description: '', status: 'scheduled', scheduledStart: start, scheduledEnd: end };
vi.mock('../../services/api-client', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ settings: {} }) } }));
vi.mock('../../services/classroom.service', () => ({ classroomService: { listSessions: async () => [session], getSession: async () => session }, getClassroomErrorMessage: String }));
vi.mock('../../services/course.service', () => ({ courseService: { listInstructorCourses: async () => ({ items: [{ id: 'course', title: 'Tên khóa học', status: 'published' }] }) }, getCourseErrorMessage: String }));
vi.mock('../../services/enrollment.service', () => ({ enrollmentService: {}, getEnrollmentErrorMessage: String }));
vi.mock('../auth/auth-store', () => ({ useAuthSession: () => ({ user: { roles: ['student'] } }) }));
function Switch() { const { locale, setLocale } = usePlatform(); return <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>switch</button>; }
beforeEach(() => { localStorage.setItem('gds.locale.v1', 'vi'); document.documentElement.lang = 'vi'; });
it.each(['dashboard', 'join'])('updates %s date formatting after both locale switches', async surface => {
 render(<PlatformProvider><MemoryRouter initialEntries={['/session/session']}><Switch /><Routes><Route path='/session/:sessionId' element={surface === 'dashboard' ? <ClassroomDashboard mode='instructor' /> : <ClassroomJoinPage />} /></Routes></MemoryRouter></PlatformProvider>);
 await screen.findByText('Tên buổi học');
 const format = (locale: string) => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(start));
 const hasDate = (locale: string) => screen.getByText((_, node) => ['P', 'DD'].includes(node?.tagName ?? '') && node?.textContent?.includes(format(locale)) === true);
 expect(hasDate('vi-VN')).toBeInTheDocument();
 act(() => screen.getByRole('button', { name: 'switch' }).click()); expect(hasDate('en-US')).toBeInTheDocument();
 act(() => screen.getByRole('button', { name: 'switch' }).click()); expect(hasDate('vi-VN')).toBeInTheDocument();
});
