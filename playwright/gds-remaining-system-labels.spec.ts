import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';

const ledger = [{ id: 'ledger-1', userId: 'earn', kind: 'earn', sourceType: 'platform_activity', amount: 120, adjustmentDirection: null, occurredAt: '2026-11-14T00:00:00Z' }];
const campaign = { id: 'campaign-1', title: 'Nháp', description: 'Authored description', status: 'draft', benefitKind: 'fixed_credit', benefitValue: 100, applicationMode: 'application', currency: 'VND', quota: 10, awardedCount: 2, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-12-01T00:00:00Z', courseIds: [], categorySlugs: [], eligibleUserIds: [] };
const job = { id: 'job-1', title: 'Từ xa', companyName: 'Remote', summary: 'Authored summary', description: 'Authored description', location: '', workMode: 'remote', employmentType: 'full_time', requiredSkills: [], closesAt: null };
function pageOf(items: unknown[]) { return { items, page: 1, pageSize: 20, total: items.length, totalPages: 1 }; }
async function prepare(page: Page, role = 'platform_admin') {
 const writes: string[] = [], errors: string[] = [];
 page.on('pageerror', error => errors.push(error.name));
 await page.addInitScript(role => {
  localStorage.setItem('gds.locale.v1', 'vi');
  localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic', refreshToken: 'synthetic', expiresIn: 900, tokenType: 'Bearer', user: { id: '10000000-0000-4000-8000-000000000001', email: 'synthetic@example.test', fullName: 'Authored learner', status: 'active', roles: [role] } }));
 }, role);
 await page.route('**/api/v1/**', async route => {
  const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
  if (request.method() !== 'GET') writes.push(path);
  let data: unknown = { items: [], unreadCount: 0 };
  if (path === '/platform/settings') data = { settings: DEFAULT_PLATFORM_SETTINGS };
  else if (path === '/tmi/wallet') data = { current: 120, earned: 120, spent: 0, expired: 0 };
  else if (path === '/tmi/rewards' || path === '/admin/tmi/rewards') data = pageOf([{ id: 'reward-1', title: 'Quà tặng', description: 'Quyền truy cập khóa học', kind: 'course_access', status: 'draft', cost: 40, endsAt: '2026-12-01T00:00:00Z', startsAt: '2026-11-01T00:00:00Z', quota: null, redeemedCount: 0 }]);
  else if (path === '/tmi/history') data = ledger;
  else if (path === '/admin/tmi/ledger') data = pageOf(ledger);
  else if (path === '/admin/scholarships') data = pageOf([campaign]);
  else if (path === '/admin/scholarships/campaign-1/applications') data = pageOf([{ id: 'application-1', userId: 'pending', courseId: 'course_access', status: 'pending' }]);
  else if (path === '/jobs') data = pageOf([job, { ...job, id: 'job-2', title: 'Authored location', location: 'Từ xa' }]);
  else if (path === '/jobs/job-1') data = job;
  await route.fulfill({ json: { success: true, data } });
 });
 return { writes, errors };
}
async function locale(page: Page, value: string) { await page.getByRole('combobox', { name: /Ngôn ngữ|Language/ }).selectOption(value); }
async function responsive(page: Page) {
 for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 }
}

test('student ledger and reward labels update live while authored content stays unchanged', async ({ page }) => {
 const { writes, errors } = await prepare(page, 'student');
 await page.goto('/dashboard/tmi');
 for (const language of ['vi', 'en', 'vi']) {
  await locale(page, language);
  await expect(page.locator('.tmi-rewards__history')).toContainText(language === 'vi' ? 'Tích lũy' : 'Earned');
  await expect(page.locator('.tmi-rewards__history')).toContainText(language === 'vi' ? 'Hoạt động nền tảng' : 'Platform activity');
  await expect(page.locator('.tmi-rewards__history')).toContainText('120 GDS Point');
  await expect(page.locator('.tmi-rewards__reward-kind')).toHaveText(language === 'vi' ? 'Quyền truy cập khóa học' : 'Course access');
  await expect(page.locator('.tmi-rewards__reward-card h3')).toHaveText('Quà tặng');
  await expect(page.locator('.tmi-rewards__reward-card p')).toHaveText('Quyền truy cập khóa học');
  await responsive(page);
 }
 expect(writes).toEqual([]); expect(errors).toEqual([]);
});
test('admin ledger and scholarship enums retain canonical IDs and campaign titles', async ({ page }) => {
 const { writes, errors } = await prepare(page);
 await page.goto('/admin/dashboard/tmi');
 await locale(page, 'en');
 await expect(page.locator('.admin-tmi-table-wrap')).toContainText('Earned');
 await expect(page.locator('.admin-tmi-status')).toHaveText('Draft');
 await expect(page.locator('.admin-tmi-list__item small')).toContainText('Course access');
 await expect(page.locator('.admin-tmi-list__item strong')).toHaveText('Quà tặng');
 await expect(page.locator('.admin-tmi-table-wrap')).toContainText('Platform activity');
 await expect(page.getByRole('cell', { name: 'earn', exact: true })).toBeVisible();
 await responsive(page);
 await page.goto('/admin/dashboard/scholarships');
 await page.locator('.admin-scholarship-list__item').click();
 for (const language of ['vi', 'en', 'vi']) {
  await locale(page, language);
  await expect(page.locator('.admin-scholarship-list__item em')).toHaveText(language === 'vi' ? 'Nháp' : 'Draft');
  await expect(page.locator('.admin-scholarship-list__item small')).toContainText(language === 'vi' ? 'Tín dụng cố định' : 'Fixed credit');
  await expect(page.getByRole('cell', { name: language === 'vi' ? 'Chờ duyệt' : 'Pending', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'pending', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nháp', exact: true })).toBeVisible();
  await responsive(page);
 }
 expect(writes).toEqual([]); expect(errors).toEqual([]);
});
test('job work-mode fallbacks translate while authored locations and titles remain unchanged', async ({ page }) => {
 const { writes, errors } = await prepare(page);
 await page.goto('/jobs');
 for (const language of ['vi', 'en', 'vi']) {
  await locale(page, language);
  await expect(page.locator('.job-card__location')).toHaveText([language === 'vi' ? 'Từ xa' : 'Remote', 'Từ xa']);
  await expect(page.getByRole('heading', { name: 'Từ xa', exact: true })).toBeVisible();
  await responsive(page);
 }
 await page.goto('/jobs/job-1'); await locale(page, 'en');
 await expect(page.locator('.job-detail header span')).toHaveText('Remote');
 await expect(page.getByRole('heading', { name: 'Từ xa', exact: true })).toBeVisible();
 await responsive(page);
 expect(writes).toEqual([]); expect(errors).toEqual([]);
});
