import { expect, test } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';

for (const locale of ['vi', 'en'] as const) for (const historical of [false, true]) {
  test(`Public program selection ${locale}, historical=${historical}`, async ({ page }) => {
    const settings = structuredClone(DEFAULT_PLATFORM_SETTINGS);
    settings.courses.categories.reverse();
    if (historical) for (const group of settings.courses.categories) Reflect.deleteProperty(group, 'id');
    else {
      const group = settings.courses.categories.find(group => group.id === 'k12')!;
      group.vi = 'Chương trình trường học'; group.en = 'School programs';
    }
    const errors: string[] = [], writes: string[] = [];
    page.on('pageerror', error => errors.push(error.name));
    await page.addInitScript(locale => { if (window.top === window) localStorage.setItem('gds.locale.v1', locale); }, locale);
    await page.route('**/api/v1/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
      if (request.method() !== 'GET') { writes.push(path); return route.abort(); }
      let data: unknown = { items: [], unreadCount: 0 };
      if (path === '/platform/settings') data = { settings };
      if (path === '/courses') data = [{ id: 'synthetic-native', title: 'Native Sample Course', slug: 'native-sample',
        description: null, thumbnailUrl: null, badge: null, categorySlug: 'existing-discount-category', featuredRank: null,
        level: 'beginner', status: 'published', visibility: 'public', price: null,
        instructor: { id: 'synthetic-instructor', fullName: 'Test Instructor', avatarUrl: null, headline: null },
        metrics: { lessonCount: 1, durationMinutes: 1, enrollmentCount: 0, ratingAverage: null, ratingCount: 0 },
        createdAt: '2026-11-16T00:00:00Z', updatedAt: '2026-11-16T00:00:00Z' }];
      await route.fulfill({ json: { success: true, data } });
    });
    await page.goto('/courses?program=k12&q=Sample&level=beginner');
    const empty = page.getByRole('heading', { name: locale === 'vi' ? 'Chưa có chương trình được kết nối' : 'No connected programs yet' });
    await expect(empty).toBeVisible();
    if (!historical) await expect(page.getByRole('heading', { name: locale === 'vi' ? 'Chương trình trường học' : 'School programs', exact: true })).toBeVisible();
    for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(empty).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Native Sample Course' })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const control = width < 900 ? page.getByRole('combobox', { name: locale === 'vi' ? 'Nhóm chương trình' : 'Program group' })
        : page.locator('.course-programs__desktop button').filter({ hasText: locale === 'vi' ? 'Khóa học trực tuyến' : 'Online courses' });
      await control.focus(); await expect(control).toBeFocused();
      if (width < 900) { await expect(control.locator('option')).toHaveCount(6); await control.selectOption('online'); }
      else await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: 'Native Sample Course' })).toBeVisible();
      expect(new URL(page.url()).searchParams.get('q')).toBe('Sample');
      expect(new URL(page.url()).searchParams.get('level')).toBe('beginner');
      await page.goBack(); await expect(empty).toBeVisible();
      if (width === 390 || width === 1440) await page.screenshot({ path: test.info().outputPath(`program-${locale}-${historical}-${width}.png`), fullPage: true });
    }
    await expect(page.getByRole('link', { name: locale === 'vi' ? 'Tìm hiểu liên kết GDS' : 'Explore GDS partnerships' })).toHaveAttribute('href', '/partners');
    expect(errors).toEqual([]); expect(writes).toEqual([]);
  });
}
