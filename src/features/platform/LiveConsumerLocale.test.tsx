import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PlatformProvider, usePlatform } from './PlatformProvider';
import { MentorBookingsPage } from '../mentors/MentorBookingsPage';
import { AssignmentSubmissionPage } from '../assignments/AssignmentSubmissionPage';
import { InstructorAssignmentManagementPage } from '../dashboard/InstructorDashboard/InstructorAssignmentManagementPage';
import { AdminDashboardOverview } from '../dashboard/AdminDashboard/AdminDashboardOverview';

const mocks = vi.hoisted(() => ({ bookings: vi.fn(), assignment: vi.fn(), assignments: vi.fn() }));
vi.mock('../../services/api-client', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ settings: {} }) } }));
vi.mock('../../services/mentor.service', () => ({ mentorService: { listStudentBookings: mocks.bookings, listInstructorBookings: mocks.bookings } }));
vi.mock('../mentors/MentorOutcomePanel', () => ({ MentorOutcomePanel: () => null }));
vi.mock('../../services/assignment.service', () => ({ assignmentService: {
  getAssignment: mocks.assignment, listCourseAssignments: mocks.assignments,
  getMySubmission: vi.fn().mockResolvedValue(null), listMySubmissions: vi.fn().mockResolvedValue([]), listSubmissions: vi.fn().mockResolvedValue([]),
}, getAssignmentErrorMessage: () => 'Failure' }));

function Switch() { const { locale, setLocale } = usePlatform(); return <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>Switch</button>; }
const dueDate = '2030-12-24T09:00:00Z';
const assignment = { id: 'assignment', title: 'Authored title', description: 'Authored description', status: 'published', dueDate, maxScore: 10, courseId: 'course', allowedFileMimeTypes: [] };
beforeEach(() => { localStorage.clear(); document.documentElement.lang = 'vi'; mocks.assignment.mockResolvedValue(assignment); mocks.assignments.mockResolvedValue([assignment]); });
afterEach(() => { localStorage.clear(); document.documentElement.lang = 'vi'; });
const toggle = () => fireEvent.click(screen.getByRole('button', { name: 'Switch' }));

it.each(['student', 'instructor'] as const)('relocalizes all booking statuses and dates for %s without changing authored content', async mode => {
  const statuses = ['requested', 'accepted', 'reschedule_requested', 'rejected', 'cancelled', 'completed'];
  mocks.bookings.mockResolvedValue({ items: statuses.map(status => ({ id: status, status, topic: `Authored ${status}`, scheduledStart: dueDate, scheduledEnd: '2030-12-24T10:00:00Z', history: [], mentorProfile: { user: { fullName: 'Mentor' } }, student: { fullName: 'Student' } })) });
  const { container } = render(<PlatformProvider><Switch /><MentorBookingsPage mode={mode} /></PlatformProvider>);
  await screen.findByText('Authored requested');
  for (const locale of ['vi-VN', 'en-US', 'vi-VN']) {
    if (locale === 'en-US' || document.documentElement.lang === 'en') toggle();
    const labels = locale === 'vi-VN' ? ['Đã yêu cầu', 'Đã chấp nhận', 'Đề xuất đổi lịch', 'Đã từ chối', 'Đã hủy', 'Đã hoàn thành'] : ['Requested', 'Accepted', 'Reschedule requested', 'Rejected', 'Cancelled', 'Completed'];
    labels.forEach(label => expect(screen.getAllByText(label).length).toBeGreaterThan(0));
    expect(container.querySelector('time')).toHaveTextContent(new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dueDate)));
    expect(screen.getAllByText(`→ ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date('2030-12-24T10:00:00Z'))}`)).toHaveLength(6);
    expect(screen.getByText('Authored reschedule_requested')).toBeInTheDocument();
  }
});

it.each(['student', 'instructor'])('relocalizes the %s assignment due date in both directions', async mode => {
  render(<PlatformProvider><Switch /><MemoryRouter initialEntries={['/assignments/assignment/submit']}><Routes><Route path='/assignments/:assignmentId/submit' element={mode === 'student' ? <AssignmentSubmissionPage /> : <InstructorAssignmentManagementPage courseId='course' />} /></Routes></MemoryRouter></PlatformProvider>);
  await screen.findAllByText('Authored title');
  for (const locale of ['vi-VN', 'en-US', 'vi-VN']) {
    if (locale === 'en-US' || document.documentElement.lang === 'en') toggle();
    const date = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dueDate));
    expect(screen.getAllByText((_, element) => element?.textContent?.includes(date) === true && !Array.from(element.children).some(child => child.textContent?.includes(date))).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Authored title').length).toBeGreaterThan(0);
  }
});

it('relocalizes admin numbers and every operational signal in both directions', () => {
  const overview = { users: { total: 1234, suspended: 1234, inactive: 1234 }, roles: { student: 1234, instructor: 1234, platformAdmin: 1234 }, courses: { total: 1234, draft: 1234 }, enrollments: { active: 1234 }, certificates: { issued: 1234 }, aiUsage: { messages: 1234 }, community: { posts: 1234 }, library: { resources: 1234 }, classrooms: { total: 1234, live: 1234, scheduled: 1234 } };
  render(<PlatformProvider><Switch /><AdminDashboardOverview fullName='Authored Admin' overview={overview as Parameters<typeof AdminDashboardOverview>[0]['overview']} /></PlatformProvider>);
  for (const locale of ['vi', 'en', 'vi']) {
    if (locale === 'en' || document.documentElement.lang === 'en') toggle();
    const number = locale === 'vi' ? '1.234' : '1,234';
    expect(screen.getAllByText(number).length).toBeGreaterThan(5);
    const labels = locale === 'vi' ? ['tài khoản bị tạm ngưng', 'tài khoản chưa hoạt động', 'khóa học bản nháp', 'lớp đang diễn ra', 'lớp đã lên lịch'] : ['suspended accounts', 'inactive accounts', 'draft courses', 'live classrooms', 'scheduled classrooms'];
    labels.forEach(label => expect(screen.getByText(`${number} ${label}`)).toBeInTheDocument());
    const details = locale === 'vi' ? ['Kiểm tra các giới hạn truy cập đang có hiệu lực.', 'Theo dõi trạng thái kích hoạt tài khoản.', 'Nội dung chưa được xuất bản trên hệ thống.', 'Phiên học trực tuyến hiện đang hoạt động.', 'Phiên học trực tuyến đang chờ bắt đầu.'] : ['Review access restrictions currently in effect.', 'Monitor account activation status.', 'Content has not been published on the platform.', 'Online sessions are currently active.', 'Online sessions are waiting to start.'];
    details.forEach(detail => expect(screen.getByText(detail)).toBeInTheDocument());
  }
});
