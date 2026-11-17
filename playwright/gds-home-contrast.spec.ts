import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';

const widths = [320, 375, 390, 412, 768, 1024, 1440];
for (const palette of ['configured', 'default'] as const) {
  test(`home certificate CTA remains readable with ${palette} branding`, async ({ page }, testInfo) => {
    const settings = structuredClone(DEFAULT_PLATFORM_SETTINGS);
    if (palette === 'configured') {
      settings.branding.colors.violet = '#000000';
      settings.branding.colors.magenta = '#ffffff';
    }
    const errors: string[] = [], writes: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => localStorage.setItem('gds.locale.v1', 'vi'));
    await page.route('**/api/v1/**', async route => {
      if (route.request().method() !== 'GET') writes.push(route.request().method() + ' ' + new URL(route.request().url()).pathname);
      const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
      await route.fulfill({ json: { success: true, data: path === '/platform/settings' ? { settings } : { items: [], total: 0, totalPages: 0 } } });
    });
    await page.goto('/');
    const cta = page.locator('.home-certificate a[href="/certificates"]');
    await expect(cta).toBeVisible();
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--gds-violet').trim())).toBe(settings.branding.colors.violet);
    const diagnostics: unknown[] = [];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const locale of ['vi', 'en', 'vi']) {
        await page.getByRole('combobox', { name: /Ngôn ngữ|Language/ }).selectOption(locale);
        await expect(cta).toHaveText(locale === 'vi' ? 'Nhận chứng chỉ ngay' : 'Earn your certificate');
        const result = await cta.evaluate(element => {
          const style = getComputedStyle(element);
          const rgba = (color: string) => color.match(/[\d.]+/g)!.map(Number);
          const luminance = (color: number[]) => color.slice(0, 3).map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
          const background = rgba(style.backgroundColor), foreground = rgba(style.color);
          const light = Math.max(luminance(background), luminance(foreground)), dark = Math.min(luminance(background), luminance(foreground));
          return { backgroundImage: style.backgroundImage, backgroundColor: style.backgroundColor, foregroundColor: style.color, opaque: background.length === 3 || background[3] === 1, contrast: (light + 0.05) / (dark + 0.05), overflow: document.documentElement.scrollWidth > window.innerWidth };
        });
        diagnostics.push({ width, locale, ...result });
        await testInfo.attach(`contrast-${palette}-${width}-${locale}.json`, { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
        expect(result.backgroundImage, 'Text must have a uniform readable background across all glyphs').toBe('none');
        expect(result.opaque).toBe(true);
        expect(result.contrast).toBeGreaterThanOrEqual(4.5);
        expect(result.overflow).toBe(false);
      }
    }
    const screenshotPath = testInfo.outputPath(`certificate-${palette}.png`);
    const diagnosticPath = testInfo.outputPath(`contrast-${palette}.json`);
    await cta.screenshot({ path: screenshotPath });
    await writeFile(diagnosticPath, JSON.stringify(diagnostics, null, 2));
    await testInfo.attach(`certificate-${palette}.png`, { path: screenshotPath, contentType: 'image/png' });
    await testInfo.attach(`contrast-${palette}.json`, { path: diagnosticPath, contentType: 'application/json' });
    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
  });
}
