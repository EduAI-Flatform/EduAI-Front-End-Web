import { test, expect, type Page } from '@playwright/test';

async function expectHeaderFitsAfterFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const bounds = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    controls: Array.from(document.querySelectorAll('.app-header a, .app-header button'))
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({ left: rect.left, right: rect.right })),
  }));
  expect(bounds.document).toBeLessThanOrEqual(bounds.viewport);
  for (const control of bounds.controls) {
    expect(control.left).toBeGreaterThanOrEqual(0);
    expect(control.right).toBeLessThanOrEqual(bounds.viewport);
  }
}

async function expectTabletHeaderFitsWithWiderFont(page: Page) {
  // Font metrics vary between CI engines and operating systems. Force wider
  // navigation text so the test exercises wrapping rather than spare pixels.
  await page.addStyleTag({ content: '.app-header__nav .app-header__nav-link { font-size: 15px; }' });
  await expectHeaderFitsAfterFonts(page);
  const layout = await page.locator('.app-header').evaluate((header) => {
    const bounds = header.getBoundingClientRect();
    return {
      top: bounds.top, bottom: bounds.bottom,
      links: Array.from(header.querySelectorAll('.app-header__nav a')).map((link) => {
        const rect = link.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      }),
    };
  });
  for (const link of layout.links) {
    expect(link.top).toBeGreaterThanOrEqual(layout.top);
    expect(link.bottom).toBeLessThanOrEqual(layout.bottom);
  }
}

for (const { width, fontPressure } of [
  ...[320, 768, 1024, 1440].map((width) => ({ width, fontPressure: false })),
  { width: 768, fontPressure: true },
]) {
  test(`membership entrance and login return path at ${width}px${fontPressure ? ' with wider font' : ''}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    // Navigation needs no backend account or payment data.
    await page.route('**/api/**', (route) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [] } }),
    }));
    await page.goto('/');
    const label = 'G\u00f3i th\u00e0nh vi\u00ean';
    await expect(page.locator('.app-footer').getByRole('link', { name: label })).toHaveAttribute('href', '/membership');
    const desktop = page.locator('.app-header__nav').getByRole('link', { name: label });
    if (width < 768) {
      await page.locator('.app-header__mobile-nav').getByRole('button').click();
      await expect(page.getByRole('dialog').getByRole('link', { name: label })).toBeVisible();
      await page.getByRole('dialog').getByRole('link', { name: label }).click();
    } else {
      await expect(desktop).toBeVisible();
      await expectHeaderFitsAfterFonts(page);
      if (fontPressure) await expectTabletHeaderFitsWithWiderFont(page);
      await desktop.click();
    }
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fmembership$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

for (const { width, fontPressure } of [
  ...[768, 1024, 1440].map((width) => ({ width, fontPressure: false })),
  { width: 768, fontPressure: true },
]) {
  test(`signed-in student reaches membership catalog at ${width}px without payment writes${fontPressure ? ' with wider font' : ''}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((session) => window.localStorage.setItem('eduai.auth.session.v1', session), JSON.stringify({
      accessToken: 'membership-navigation-local-fixture', refreshToken: '', tokenType: 'Bearer', expiresIn: 3600,
      user: { id: 'membership-ui-student', email: 'learner@example.test', fullName: 'Student Example',
        status: 'active', roles: ['student'], createdAt: '2026-11-02T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' },
    }));
    const writes: string[] = [];
    const methodReads: string[] = [];
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.route('**/api/**', (route) => {
      const request = route.request();
      if (request.method() !== 'GET') writes.push(request.method() + ' ' + new URL(request.url()).pathname);
      const pathname = new URL(request.url()).pathname;
      if (pathname.endsWith('/payments/methods')) methodReads.push(pathname);
      if (pathname.endsWith('/membership/checkout')) {
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true,
          data: { order: { id: 'membership-ui-order' } } }) });
      }
      const data = pathname.endsWith('/membership/current')
        ? { membership: null, pendingChange: null, expiringGraceCourses: [] }
        : pathname.endsWith('/membership/catalog') ? { items: [{
          id: 'membership-ui-version', plan: { id: 'membership-ui-plan', code: 'UAT' },
          displayName: 'Membership navigation fixture', description: null, currency: 'VND',
          durations: [{ id: 'membership-ui-month', months: 1, basePriceAmountMinor: '10000',
            discountPercent: null, finalPriceAmountMinor: '10000' }],
          services: [], includedCourses: [], removedCourses: [],
        }] }
        : pathname.endsWith('/payments/methods') ? { methods: ['payos'] }
        : pathname.endsWith('/commerce/orders/membership-ui-order') ? {
          id: 'membership-ui-order', orderNumber: 'EDU-MEMBERSHIP-UI', status: 'PENDING_PAYMENT',
          fulfillmentStatus: 'NOT_STARTED', paymentRequired: true, payment: null, lines: [],
          subtotal: { amountMinor: '10000', currency: 'VND' }, discount: { amountMinor: '0', currency: 'VND' },
          payable: { amountMinor: '10000', currency: 'VND' }, createdAt: '2026-11-03T00:00:00.000Z',
        }
        : pathname.endsWith('/notifications/unread-count') ? { unreadCount: 0 }
        : { items: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
    });
    await page.goto('/');
    const entrance = page.locator('.app-header__nav').getByRole('link', { name: 'G\u00f3i th\u00e0nh vi\u00ean' });
    await expect(entrance).toBeVisible();
    await expectHeaderFitsAfterFonts(page);
    if (fontPressure) await expectTabletHeaderFitsWithWiderFont(page);
    await entrance.click();
    await expect(page).toHaveURL(/\/membership$/);
    await expect(page.getByRole('heading', { name: 'Membership navigation fixture' })).toBeVisible();
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(0);
    expect(methodReads).toEqual([]);
    await expectHeaderFitsAfterFonts(page);
    expect(writes).toEqual([]);
    await page.getByRole('checkbox').check();
    await page.locator('main article').getByRole('button').click();
    await expect(page).toHaveURL(/\/orders\/membership-ui-order$/);
    await expect(page.getByRole('heading', { name: 'EDU-MEMBERSHIP-UI' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /PayOS/ })).toBeVisible();
    expect(writes).toEqual(['POST /api/v1/membership/checkout']);
    expect(pageErrors).toEqual([]);
  });
}
