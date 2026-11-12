import { expect, test, type Page } from '@playwright/test';

const courseId = '11111111-1111-4111-8111-111111111111';
const lessonId = '22222222-2222-4222-8222-222222222222';
const quizId = '33333333-3333-4333-8333-333333333333';
const now = '2026-11-11T00:00:00.000Z';
const lesson = { id: lessonId, courseId, title: 'Bài học thử nghiệm', slug: 'bai-hoc', type: 'video', orderIndex: 1,
  durationMinutes: 1, isPreview: false, isRequired: true, createdAt: now, updatedAt: now,
  content: 'Nội dung dùng để kiểm thử giao diện.', videoUrl: '/synthetic-video.mp4', documentUrl: null };
const course = { id: courseId, title: 'Khóa học nháp GDS', slug: 'khoa-hoc', description: '**Kiến thức nền tảng**\n- Mục tiêu thứ nhất',
  thumbnailUrl: null, level: 'beginner', status: 'draft', visibility: 'private', badge: null, featuredRank: null, price: null,
  instructor: { id: 'instructor-test', fullName: 'Giảng viên kiểm thử', avatarUrl: null, headline: null, bio: null },
  metrics: { lessonCount: 1, durationMinutes: 1, enrollmentCount: 0, ratingAverage: null, ratingCount: 0 },
  lessonCount: 1, createdAt: now, updatedAt: now };
const lessonStep = { id: lessonId, type: 'LESSON', title: lesson.title, position: 0, isRequired: true,
  status: 'IN_PROGRESS', lockedReason: null, progressPercent: 0, lastPositionSeconds: 0 };
const quizStep = { id: quizId, type: 'QUIZ', title: 'Quiz cuối video', position: 1, isRequired: false, status: 'AVAILABLE', lockedReason: null };
const learningPath = { courseId, steps: [lessonStep, quizStep], currentStep: lessonStep, nextStep: quizStep,
  completedLessonIds: [], completedSteps: 0, totalSteps: 2, progressPercent: 0, completed: false };

async function prepare(page: Page, denyPreview = false) {
  const writes: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', tokenType: 'Bearer', expiresIn: 900,
      user: { id: 'instructor-test', email: 'synthetic@example.test', fullName: 'Giảng viên kiểm thử', roles: ['instructor', 'student'], status: 'active', createdAt: '2026-11-11', updatedAt: '2026-11-11' } }));
  });
  await page.route('**/synthetic-video.mp4', route => route.fulfill({ status: 204, contentType: 'video/mp4' }));
  await page.route(/\/api\/v1\//, async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname.replace('/api/v1', '');
    if (request.method() !== 'GET') writes.push(pathname);
    if (denyPreview && pathname.endsWith('/preview')) {
      return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } }) });
    }
    let data: unknown = [];
    if (pathname === '/platform/settings') data = { settings: {} };
    else if (pathname === `/courses/${courseId}/preview` || pathname === `/courses/${courseId}`) data = course;
    else if (pathname.endsWith('/learning-path') || pathname.endsWith('/progress')) data = learningPath;
    else if (pathname.endsWith('/quizzes/available')) data = [{ id: quizId, courseId, lessonId, title: quizStep.title, status: 'published', isRequired: false }];
    else if (pathname.endsWith('/lessons')) data = [lesson];
    else if (pathname === `/lessons/${lessonId}`) data = lesson;
    else if (pathname.includes('notifications')) data = { items: [], total: 0, unreadCount: 0, totalPages: 0 };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data, message: 'Synthetic fixture' }) });
  });
  return { writes, pageErrors };
}

for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
  test(`author preview and post-video quiz at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { writes, pageErrors } = await prepare(page);
    await page.goto(`/courses/${courseId}?preview=1`);
    await expect(page.getByRole('heading', { name: course.title, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Xem trước dành cho tác giả' })).toBeVisible();
    await page.getByRole('tab', { name: 'Tổng quan', exact: true }).click();
    await expect(page).toHaveURL(/preview=1/);
    await expect(page.getByRole('status').filter({ hasText: 'Xem trước dành cho tác giả' })).toBeVisible();
    await expect(page.locator('.rich-description strong')).toHaveText('Kiến thức nền tảng');
    await page.getByRole('button', { name: 'Xem trước bài học', exact: true }).click();
    await expect(page.getByRole('dialog', { name: lesson.title })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(writes.filter(path => /enroll|progress|attempt/.test(path))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/gds-course-preview-${width}.png`, fullPage: true });

    await page.goto(`/learning/${courseId}?step=${lessonId}`);
    const video = page.locator('video');
    await expect(video).toBeVisible();
    await expect(page.getByRole('region', { name: 'Quiz cuối video' })).toHaveCount(0);
    await video.evaluate(element => {
      Object.defineProperty(element, 'duration', { configurable: true, value: 60 });
      element.dispatchEvent(new Event('ended', { bubbles: true }));
    });
    await expect(page.getByRole('region', { name: 'Quiz cuối video' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Quiz cuối video — Làm quiz/ })).toHaveAttribute('href', `/quizzes/${quizId}/take`);
    await page.screenshot({ path: `test-results/gds-video-quiz-${width}.png`, fullPage: true });
    expect(writes.filter(path => /attempt/.test(path))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole('button', { name: 'Để sau', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Quiz cuối video' })).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
}

test('denied author preview never falls back to public draft contents', async ({ page }) => {
  await prepare(page, true);
  await page.goto(`/courses/${courseId}?preview=1`);
  await expect(page.getByText('Course not found', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: course.title, exact: true })).toHaveCount(0);
});
