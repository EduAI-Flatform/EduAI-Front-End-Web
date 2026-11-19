import type { Page } from '@playwright/test';

/** Use the actual accessible GDS locale dropdown in browser regressions. */
export async function selectGdsLocale(page: Page, value: string) {
  if (value !== 'vi' && value !== 'en') throw new Error('Unsupported locale');
  const menu = page.locator('.gds-language-menu');
  await menu.locator('summary').click();
  await menu.locator('.gds-language-menu__panel button').nth(value === 'vi' ? 0 : 1).click();
}
