import { expect, test } from '@playwright/test';
const pending = {
  accessToken: 'synthetic-pending', refreshToken: 'synthetic-refresh', expiresIn: 900, tokenType: 'Bearer', mfaRequired: true,
  user: { id: 'mfa-test', fullName: 'MFA Test', email: 'mfa@example.test', status: 'active', roles: ['student'], createdAt: '2026-11-11', updatedAt: '2026-11-11' },
};
for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
  test('MFA challenge responsive and verification at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(session => localStorage.setItem('eduai.auth.session.v1', JSON.stringify(session)), pending);
    let verificationCount = 0;
    await page.route('**/api/v1/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/auth/mfa/verify')) {
        verificationCount++;
        const code = route.request().postDataJSON()?.code;
        if (code === '123456') return route.fulfill({ status: 200, json: { success: true, data: { ...pending, mfaRequired: false } } });
        return route.fulfill({ status: 401, json: { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid code' } } });
      }
      if (url.pathname.endsWith('/platform/settings')) return route.fulfill({ json: { success: true, data: { settings: {} } } });
      return route.fulfill({ json: { success: true, data: { items: [], total: 0, stats: {}, overview: {} } } });
    });
    await page.goto('/auth/mfa?redirectTo=%2Fsupport');
    await expect(page.getByRole('heading', { name: 'Xác thực hai bước' })).toBeVisible();
    const input = page.getByLabel('Mã xác thực hoặc mã khôi phục');
    await input.fill('000000');
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(page.url()).toContain('/auth/mfa');
    await input.fill('123456');
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(page).toHaveURL(/\/support$/);
    expect(verificationCount).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
test('protected route sends pending sessions to MFA before opening content', async ({ page }) => {
  await page.addInitScript(session => localStorage.setItem('eduai.auth.session.v1', JSON.stringify(session)), pending);
  await page.route('**/api/v1/**', route => route.fulfill({ json: { success: true, data: { settings: {} } } }));
  await page.goto('/support');
  await expect(page).toHaveURL(/\/auth\/mfa\?redirectTo=/);
  await expect(page.getByRole('heading', { name: 'Xác thực hai bước' })).toBeVisible();
});
