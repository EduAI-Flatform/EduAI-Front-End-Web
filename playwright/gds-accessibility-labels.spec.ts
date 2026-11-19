import { expect, test, type Locator } from '@playwright/test';
import { DEFAULT_PLATFORM_SETTINGS } from '../src/features/platform/platform.defaults';

const widths = [320, 375, 390, 412, 768, 1024, 1440];
const authoredTitle = 'All / Tất cả — authored support title';
const escaped = (value: string) => value.replace(/[.*+?^$()|[\]\\]/g, '\\$&');

async function expectVisibleLabelInName(control: Locator) {
  const visible = (await control.innerText()).trim();
  expect(visible).not.toBe('');
  await expect.soft(control).toHaveAccessibleName(new RegExp(escaped(visible)));
}

for (const locale of ['vi', 'en'] as const) for (const width of widths) {
  test('accessible support, history labels and header targets ' + locale + ' ' + width, async ({ page }) => {
    const writes: string[] = [], unknown: string[] = [], errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(locale => {
      localStorage.setItem('gds.locale.v1', locale);
      localStorage.setItem('eduai.auth.session.v1', JSON.stringify({
        accessToken: 'synthetic-a11y-access', refreshToken: 'synthetic-a11y-refresh', tokenType: 'Bearer', expiresIn: 900,
        user: { id: 'synthetic-a11y-owner', email: 'fixture@example.test', fullName: 'Synthetic fixture', roles: ['instructor'], status: 'active' },
      }));
    }, locale);
    await page.route('**/api/v1/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
      if (request.method() !== 'GET') { writes.push(request.method() + ' ' + path); return route.abort(); }
      let data: unknown;
      if (path === '/platform/settings') data = { settings: { ...DEFAULT_PLATFORM_SETTINGS, operations: { ...DEFAULT_PLATFORM_SETTINGS.operations, supportEnabled: true } } };
      else if (path === '/platform/support') data = { items: [{ id: 'synthetic-support', title: authoredTitle, content: 'Synthetic content',
        status: 'open', createdAt: '2026-11-17T00:00:00Z' }], page: 1, totalPages: 1 };
      else if (path === '/affiliate/me') data = { enabled: false, identities: [], totalReferrals: 0, accruedAmountMinor: '0', currency: 'VND',
        availableBalanceMinor: null, withdrawalEnabled: false, walletCreditStatus: 'PROCESSING_DISABLED', subAffiliateEnabled: false };
      else if (path === '/affiliate/performance') data = { items: [], page: 1, totalPages: 0 };
      else if (path === '/wallet/gds') data = { available: false, mode: 'disabled', state: 'DISABLED', balance: null, debtMinor: null,
        withdrawalEnabled: false, paymentEnabled: false, topupEnabled: false };
      else if (path === '/wallet/gds/withdrawal-settings') data = { minimumMinor: '10000', maximumMinor: '10000000', version: 1,
        admissionEnabled: false, processingEnabled: false, accountVerificationRequired: false, accountVerificationAvailable: false };
      else if (path === '/wallet/gds/transactions') data = { items: [
        { id: 'synthetic-topup', type: 'TOPUP_CREDIT', amountMinor: '1234', occurredAt: '2026-11-17T00:00:00Z' },
        { id: 'synthetic-withdrawal', type: 'WITHDRAWAL', status: 'PENDING', amountMinor: '1234', occurredAt: '2026-11-17T00:00:00Z', bankShortName: 'All / Authored Bank', accountNumber: '0123456789' },
      ], hasMore: false, nextCursor: null };
      else if (path === '/wallet/gds/transactions/export') data = {
        filename: 'gds-transactions-all.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dataBase64: Buffer.from('PK\x03\x04synthetic-download').toString('base64'), exported: 2,
        complete: true, scope: 'filtered_history', filter: 'all', asOf: '2026-11-17T01:00:00Z',
      };
      else if (path.includes('notifications')) data = { items: [], total: 0, unreadCount: 0 };
      else { unknown.push(path); return route.abort(); }
      return route.fulfill({ json: { success: true, data, message: 'Synthetic read-only fixture' } });
    });
    await page.goto('/support');
    const detail = page.locator('.gds-requests__table tbody button');
    await expect(detail).toHaveCount(1);
    await expectVisibleLabelInName(detail);
    await expect(detail).toHaveAccessibleName(new RegExp(escaped(authoredTitle)));
    await expect(page.locator('.gds-requests__table tbody strong')).toHaveText(authoredTitle);
    await detail.focus(); await expect(detail).toBeFocused();

    // Real geometry guards tablet wrapping: each link must have a 24px target
    // in both axes and must not overlap its visible neighbors.
    // Instructor account routes are now embedded in the Dashboard shell.
    // Test the actual visible navigation instead of the removed public header.
    const navigation = page.locator('.instructor-sidebar__nav > a');
    // Capture every box in a single DOM/layout snapshot. Reading separate
    // locator boxes while the responsive shell is settling mixes coordinates
    // across different layout frames and produces false overlap failures.
    const boxes = await navigation.evaluateAll(nodes => nodes.flatMap(node => {
      const el = node as HTMLElement;
      const rect = el.getBoundingClientRect();
      const computed = getComputedStyle(el);
      if (computed.display === 'none' || computed.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) return [];
      return [{ x: rect.x, y: rect.y, width: rect.width, height: rect.height, label: el.textContent?.trim() || '' }];
    }));
    expect(boxes.length).toBeGreaterThan(1);
    for (const box of boxes) {
      expect.soft(box.width).toBeGreaterThanOrEqual(24);
      expect.soft(box.height).toBeGreaterThanOrEqual(24);
    }
    for (let index = 0; index < boxes.length; index++) for (let next = index + 1; next < boxes.length; next++) {
      const a = boxes[index], b = boxes[next];
      const overlapWidth = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapHeight = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      expect.soft(overlapWidth <= 0 || overlapHeight <= 0,
        `Navigation targets must not overlap: ${a.label} [${a.x},${a.y},${a.width},${a.height}] vs ${b.label} [${b.x},${b.y},${b.width},${b.height}]`).toBe(true);
    }
    // Keyboard focus is validated independently after the layout snapshot.
    for (const link of await navigation.all()) {
      if (!await link.isVisible()) continue;
      await link.focus();
      await expect(link).toBeFocused();
    }

    const opener = page.locator('.gds-requests__heading > button');
    for (const closePath of ['escape', 'cancel', 'close'] as const) {
      await opener.focus(); await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      for (const key of ['Tab', 'Tab', 'Tab', 'Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
        await page.keyboard.press(key);
        expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
        expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[aria-hidden="true"]')))).toBe(false);
      }
      if (closePath === 'escape') await page.keyboard.press('Escape');
      else {
        const name = closePath === 'cancel' ? locale === 'vi' ? 'Hủy' : 'Cancel' : locale === 'vi' ? 'Đóng' : 'Close';
        await dialog.getByRole('button', { name, exact: true }).focus();
        await page.keyboard.press('Enter');
      }
      await expect(dialog).toHaveCount(0);
      await expect(opener).toBeFocused();
    }


    await page.goto('/affiliate');
    const tabs = page.locator('.affiliate-page__tabs button');
    await expect(tabs).toHaveCount(3);
    await tabs.nth(1).click();
    const filters = page.locator('.gds-history-filters button');
    await expect(filters).toHaveCount(5);
    for (const filter of await filters.all()) {
      await expectVisibleLabelInName(filter);
      await filter.focus(); await expect(filter).toBeFocused();
    }
    const history = page.locator('.gds-history-list');
    await expect(history.getByText(locale === 'vi' ? 'Nạp GDS đã xác minh' : 'Verified GDS top-up', { exact: true })).toBeVisible();
    await expect(history.getByText(locale === 'vi' ? 'Đang chờ rút' : 'Pending withdrawal', { exact: true })).toBeVisible();
    await expect(history.locator('.withdrawal-status-badge')).toHaveText(locale === 'vi' ? 'Chờ duyệt' : 'Pending approval');
    await expect(history).toContainText('All / Authored Bank');
    await expect(history).toContainText('0123456789');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: locale === 'vi' ? 'Xuất Excel theo bộ lọc này' : 'Export Excel for this filter', exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('gds-transactions-all.xlsx');
    expect(await file.failure()).toBeNull();
    await expect(page.locator('.gds-history').getByRole('status')).toContainText('2');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(writes).toEqual([]); expect(unknown).toEqual([]); expect(errors).toEqual([]);
  });
}
