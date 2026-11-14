import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';
const courseId = '10000000-0000-4000-8000-000000000001';
const widths = [320, 375, 390, 412, 768, 1024, 1440];
async function prepare(page: Page, role: 'instructor' | 'platform_admin', locale: 'vi' | 'en') {
  const settings = structuredClone(DEFAULT_PLATFORM_SETTINGS);
  Object.assign(settings.courses.quizDefaults, { passingScore: 85, timeLimitMinutes: 20, maxAttempts: 2,
    showCorrectAnswers: false, isRequired: false, allowInstructorOverrides: false });
  const errors: string[] = [], writes: Array<{ path: string; body: any }> = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ role, locale }) => {
    localStorage.setItem('gds.locale.v1', locale);
    localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh',
      tokenType: 'Bearer', expiresIn: 900, user: { id: 'synthetic-user', fullName: 'GDS synthetic operator', email: 'synthetic@example.test', roles: [role], status: 'active' } }));
  }, { role, locale });
  await page.route('**/api/v1/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
    let data: unknown = [];
    if (request.method() !== 'GET') writes.push({ path, body: request.postDataJSON() });
    if (path === '/platform/settings') data = { settings };
    else if (path === '/admin/platform/settings') data = { settings, revisions: [], groups: Object.keys(settings), versions: {} };
    else if (path === '/admin/platform/revisions' && request.method() === 'POST') data = { ...request.postDataJSON(), id: courseId, status: 'draft', version: 1, createdAt: new Date().toISOString() };
    else if (path === `/courses/${courseId}/quizzes` && request.method() === 'POST') data = { ...request.postDataJSON(), id: courseId, status: 'draft', createdAt: new Date().toISOString() };
    else if (path.includes('notifications')) data = { items: [], total: 0, totalPages: 0, unreadCount: 125 };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
  });
  return { errors, writes };
}
for (const locale of ['vi', 'en'] as const) {
  test(`governed quiz defaults in instructor UI (${locale})`, async ({ page }) => {
    const { errors, writes } = await prepare(page, 'instructor', locale);
    await page.goto(`/instructor/dashboard/courses/${courseId}/quizzes`);
    const score = page.getByRole('spinbutton', { name: locale === 'vi' ? 'Điểm đạt (%)' : 'Passing score (%)' });
    await expect(score).toHaveValue('85'); await expect(score).toBeDisabled();
    const title = page.getByRole('textbox', { name: locale === 'vi' ? 'Tên quiz' : 'Quiz name' });
    await title.fill('Synthetic governed quiz');
    await expect(page.locator('.notification-center__badge')).toHaveText('99+');
    if (locale === 'en') {
      await expect(page.getByText('No quizzes in this course yet.', { exact: true })).toBeVisible();
      await expect(page.getByText('Select or create a quiz to add questions.', { exact: true })).toBeVisible();
    }
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.screenshot({ path: test.info().outputPath(`quiz-policy-instructor-${locale}-390.png`), fullPage: true });
    await page.getByRole('button', { name: locale === 'vi' ? 'Tạo quiz' : 'Generate quiz', exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({ path: `/courses/${courseId}/quizzes`, body: { passingScore: 85, timeLimitMinutes: 20,
      maxAttempts: 2, showCorrectAnswers: false, isRequired: false } });
    expect(errors).toEqual([]);
  });
  test(`Admin can edit governed quiz defaults (${locale})`, async ({ page }) => {
    const { errors, writes } = await prepare(page, 'platform_admin', locale);
    await page.goto('/admin/dashboard/platform-settings?group=courses');
    const score = page.getByRole('spinbutton', { name: locale === 'vi' ? 'Điểm đạt mặc định (%)' : 'Default passing score (%)' });
    await expect(score).toHaveValue('85'); await score.fill('82.25');
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.screenshot({ path: test.info().outputPath(`quiz-policy-admin-${locale}-390.png`), fullPage: true });
    await page.getByRole('button', { name: locale === 'vi' ? 'Lưu bản nháp mới' : 'Save new draft', exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({ path: '/admin/platform/revisions', body: { group: 'courses', content: { quizDefaults: {
      passingScore: 82.25, maxAttempts: 2, allowInstructorOverrides: false } } } });
    expect(errors).toEqual([]);
  });
}
