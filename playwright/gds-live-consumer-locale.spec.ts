import { selectGdsLocale } from './locale-menu';
import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';

const widths = [320, 375, 390, 412, 768, 1024, 1440];
const start = '2030-12-24T09:00:00Z', end = '2030-12-24T10:00:00Z';
const authored = 'Trạng thái / Authored content';
const statuses = ['requested', 'accepted', 'reschedule_requested', 'rejected', 'cancelled', 'completed'];
const assignment = { id: 'locale-assignment', courseId: 'locale-course', lessonId: null, title: authored, description: authored,
  dueDate: start, maxScore: 10, isRequired: false, status: 'published', createdAt: start, updatedAt: start, allowedFileMimeTypes: [] };
const overview = { users: { total: 1234, active: 1234, suspended: 1234, inactive: 1234 }, roles: { student: 1234, instructor: 1234, platformAdmin: 1234 },
  courses: { total: 1234, draft: 1234, published: 1234, archived: 0 }, enrollments: { total: 1234, active: 1234, completed: 0, other: 0 }, certificates: { issued: 1234 },
  aiUsage: { conversations: 0, messages: 1234, generatedQuizzes: 0, flashcards: 0, embeddings: 0 }, community: { posts: 1234, comments: 0, reactions: 0 },
  library: { resources: 1234, categories: 0, tags: 0, savedResources: 0 }, classrooms: { total: 1234, live: 1234, scheduled: 1234, ended: 0, cancelled: 0 } };
const surfaces = [
  { kind: 'bookings', role: 'student', path: '/dashboard/mentor-bookings' },
  { kind: 'bookings', role: 'instructor', path: '/instructor/dashboard/mentor-bookings' },
  { kind: 'assignment', role: 'student', path: '/assignments/locale-assignment/submit' },
  { kind: 'assignment', role: 'instructor', path: '/instructor/dashboard/courses/locale-course/assignments' },
  { kind: 'overview', role: 'platform_admin', path: '/admin/dashboard' },
];

for (const width of widths) for (const surface of surfaces) test(`${surface.kind} ${surface.role} live locale ${width}px`, async ({ page }) => {
  const writes: string[] = [], unexpected: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(({ role, authored }) => {
    localStorage.setItem('gds.locale.v1', 'vi');
    localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-locale-access', refreshToken: 'synthetic-locale-refresh', tokenType: 'Bearer', expiresIn: 900,
      user: { id: 'synthetic-locale-owner', email: 'locale@example.test', fullName: authored, roles: [role], status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-01' } }));
  }, { role: surface.role, authored });
  await page.context().route('**/api/v1/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (request.method() !== 'GET') { writes.push(`${request.method()} ${path}`); return route.abort(); }
    if (path === '/notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: ': synthetic read-only heartbeat\n\n' });
    let data: unknown;
    if (path === '/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS };
    else if (path === '/notifications' || path === '/notifications/unread-count') data = { items: [], total: 0, unreadCount: 0 };
    else if (path === '/wallet/gds') data = { available: false, mode: 'disabled', state: 'DISABLED', balance: null, debtMinor: null, withdrawalEnabled: false, paymentEnabled: false, topupEnabled: false };
    else if (path === '/tmi/wallet') data = { current: 0 };
    else if (path === '/mentor-bookings' || path === '/mentor/bookings') data = { items: statuses.map(status => ({ id: status, status, topic: `${authored} ${status}`, scheduledStart: start, scheduledEnd: end,
      cancellationReason: null, history: [], mentorProfile: { id: 'mentor', headline: authored, timezone: 'UTC', user: { fullName: authored, avatarUrl: null } }, student: { fullName: authored } })), page: 1, pageSize: 100, total: 6, totalPages: 1 };
    else if (/^\/mentor-bookings\/(accepted|completed)\/outcomes$/.test(path)) data = { sharedNote: null, privateNote: null, goals: [], review: null, rating: { average: null, count: 0 } };
    else if (path === '/assignments/locale-assignment') data = assignment;
    else if (path === '/courses/locale-course/assignments') data = [assignment];
    else if (path === '/assignments/locale-assignment/submissions/me') data = null;
    else if (path === '/assignments/locale-assignment/submissions/me/history' || path === '/assignments/locale-assignment/submissions') data = [];
    else if (path === '/admin/reports/overview') data = overview;
    else { unexpected.push(path); return route.abort(); }
    return route.fulfill({ json: { success: true, data, message: 'Synthetic read-only locale fixture' } });
  });
  await page.goto(surface.path);
  // The standalone submission page has no shell selector. Change the shared
  // preference through a real second tab, exercising the storage subscription.
  const localePage = surface.kind === 'assignment' && surface.role === 'student'
    ? await page.context().newPage() : page;
  if (localePage !== page) {
    localePage.on('pageerror', error => errors.push(error.message));
    localePage.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await localePage.goto('/dashboard/mentor-bookings');
  }
  for (const locale of ['vi', 'en', 'vi'] as const) {
    await selectGdsLocale(localePage, locale);
    if (surface.kind === 'bookings') {
      const cards = page.locator('.mentor-bookings > article');
      await expect(cards).toHaveCount(6);
      const labels = locale === 'vi' ? ['Đã yêu cầu', 'Đã chấp nhận', 'Đề xuất đổi lịch', 'Đã từ chối', 'Đã hủy', 'Đã hoàn thành'] : ['Requested', 'Accepted', 'Reschedule requested', 'Rejected', 'Cancelled', 'Completed'];
      for (let index = 0; index < statuses.length; index++) {
        await expect(cards.nth(index).locator(':scope > span').first()).toHaveText(labels[index]);
        await expect(cards.nth(index).locator('h3')).toHaveText(`${authored} ${statuses[index]}`);
        const dates = await page.evaluate(({ start, end, locale }) => [start, end].map(value => new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))), { start, end, locale });
        await expect(cards.nth(index).locator('time')).toHaveText(dates[0]);
        await expect(cards.nth(index).locator(':scope > span').nth(1)).toHaveText(`→ ${dates[1]}`);
      }
    } else if (surface.kind === 'assignment') {
      // Exact title proves the authored text never entered a translation boundary.
      await expect(page.getByText(authored, { exact: true }).first()).toBeVisible();
      const date = await page.evaluate(({ start, locale }) => new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(start)), { start, locale });
      await expect(page.getByText(date, { exact: false }).first()).toBeVisible();
    } else {
      const number = locale === 'vi' ? '1.234' : '1,234';
      await expect(page.locator('.admin-dashboard-metric strong')).toHaveText([number, number, number, number]);
      await expect(page.locator('.admin-dashboard-breakdown dd')).toHaveText([number, number, number]);
      await expect(page.locator('.admin-dashboard-activity strong')).toHaveText([number, number, number, number]);
      const labels = locale === 'vi' ? ['tài khoản bị tạm ngưng', 'tài khoản chưa hoạt động', 'khóa học bản nháp', 'lớp đang diễn ra', 'lớp đã lên lịch'] : ['suspended accounts', 'inactive accounts', 'draft courses', 'live classrooms', 'scheduled classrooms'];
      await expect(page.locator('.admin-dashboard-operation strong')).toHaveText(labels.map(label => `${number} ${label}`));
      const details = locale === 'vi' ? ['Kiểm tra các giới hạn truy cập đang có hiệu lực.', 'Theo dõi trạng thái kích hoạt tài khoản.', 'Nội dung chưa được xuất bản trên hệ thống.', 'Phiên học trực tuyến hiện đang hoạt động.', 'Phiên học trực tuyến đang chờ bắt đầu.'] : ['Review access restrictions currently in effect.', 'Monitor account activation status.', 'Content has not been published on the platform.', 'Online sessions are currently active.', 'Online sessions are waiting to start.'];
      await expect(page.locator('.admin-dashboard-operation p')).toHaveText(details);
      await expect(page.locator('.admin-dashboard-home__header')).toContainText(authored);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(writes).toEqual([]); expect(unexpected).toEqual([]); expect(errors).toEqual([]);
});
