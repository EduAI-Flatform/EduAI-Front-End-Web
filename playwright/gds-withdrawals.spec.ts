import { expect, test } from '@playwright/test';
import { guardRuntime } from './runtime-guards';
import { gdsWithdrawalQrFixture } from './fixtures/gds-withdrawal-qr';

for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
  for (const role of ['instructor', 'platform_admin']) test(`GDS withdrawals ${role} at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript(role => localStorage.setItem('eduai.auth.session.v1', JSON.stringify({ accessToken: 'synthetic-test-only', refreshToken: '', tokenType: 'Bearer', expiresIn: 3600, user: { id: role === 'platform_admin' ? 'admin-1' : 'owner-1', email: 'test@example.test', fullName: 'Người dùng kiểm thử', status: 'active', roles: [role], createdAt: '2026-11-04T01:00:00Z', updatedAt: '2026-11-04T01:00:00Z' } })), role);
    const runtime = guardRuntime(page);
    let created = false;
    let record = { id: 'withdrawal-1', ownerId: 'owner-1', amountMinor: '50000', currency: 'VND', status: 'PENDING', bankCode: 'MB', accountNumber: '123456789', accountHolder: 'NGUYEN VAN A', createdAt: '2026-11-04T01:00:00Z', updatedAt: '2026-11-04T01:00:00Z', processingAdminId: null as string | null, bankTransactionRef: null as string | null, transferredAt: null as string | null, events: [] };
    let settings = { minimumMinor: '10000', maximumMinor: '10000000', version: 1, admissionEnabled: true, processingEnabled: true, accountVerificationRequired: true, accountVerificationAvailable: true };
    await page.route('**/api/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      let data: unknown = { items: [], unreadCount: 0 };
      if (/\/banks\/.+\/logo$/.test(path)) return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 32"><rect width="40" height="32" fill="#0f2042"/><text x="6" y="22" fill="white" font-size="16">MB</text></svg>' });
      if (path.endsWith('/banks')) data = { banks: [{ code: 'MB', bin: '970422', shortName: 'MBBank', name: 'Ngân hàng Thương mại Cổ phần Quân đội', logoUrl: '/api/v1/wallet/gds/banks/MB/logo', verificationSupported: true }, { code: 'TPB', bin: '970423', shortName: 'TPBank', name: 'Ngân hàng Thương mại Cổ phần Tiên Phong', logoUrl: '/api/v1/wallet/gds/banks/TPB/logo', verificationSupported: true }], stale: false, verificationRequired: true, verificationAvailable: true };
      else if (path.endsWith('/account-verifications') || path.endsWith('/verify-account')) data = { verificationId: 'synthetic-proof', bankCode: 'MB', accountNumber: '123456789', accountHolder: 'NGUYEN VAN A', verifiedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 900000).toISOString() };
      else if (path.endsWith('/qr')) data = { withdrawalId: record.id, bankCode: record.bankCode, bankBin: '970422', bankName: 'MBBank', accountNumber: record.accountNumber, accountHolder: record.accountHolder, amountMinor: record.amountMinor, currency: 'VND', transferContent: 'GDSABC123', qrCodeDataUrl: gdsWithdrawalQrFixture, verifiedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 900000).toISOString() };
      else if (path.endsWith('/withdrawal-settings')) {
        if (request.method() === 'PATCH') settings = { ...settings, ...request.postDataJSON(), version: settings.version + 1 };
        data = settings;
      } else if (path.endsWith('/withdrawals')) {
        if (request.method() === 'POST') { expect(request.headers()['idempotency-key']).toBeTruthy(); created = true; data = record; }
        else data = { items: created || role === 'platform_admin' ? [{ ...record, accountNumber: '*****6789' }] : [], total: 1, page: 1, pageSize: 20, totalPages: 1 };
      } else if (path.endsWith('/withdrawals/withdrawal-1')) data = record;
      else if (path.includes('/withdrawals/withdrawal-1/')) {
        const action = path.split('/').pop();
        record = { ...record, status: action === 'approve' ? 'APPROVED' : action === 'process' ? 'PROCESSING' : action === 'pay' ? 'PAID' : 'CANCELLED', processingAdminId: action === 'process' ? 'admin-1' : record.processingAdminId };
        data = record;
      } else if (path.endsWith('/wallet/gds')) data = { available: true, mode: 'sandbox', state: 'READY_SANDBOX', balance: { settledMinor: '150000', reservedMinor: created ? '50000' : '0', availableMinor: created ? '100000' : '150000', currency: 'VND' }, topupEnabled: false, paymentEnabled: false, withdrawalEnabled: true, debtMinor: '0', recentTransactions: [] };
      else if (path.includes('/tmi/')) data = { current: 0, earned: 0, spent: 0, expired: 0 };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
    });
    if (role === 'instructor') {
      await page.goto('/wallet/gds');
      await expect(page.getByRole('heading', { name: 'Rút tiền GDS' })).toBeVisible();
      await page.getByRole('button', { name: 'Rút tiền', exact: true }).click();
      await page.getByLabel('Số tiền rút (VND)').fill('50000');
      await page.getByRole('combobox', { name: 'Ngân hàng', exact: true }).fill('tp bank');
      await expect(page.getByRole('option', { name: /TPBank/ })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('heading', { name: 'Rút tiền về ngân hàng' })).toBeVisible();
      await page.getByRole('combobox').fill('MB');
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
      await page.getByLabel('Số tài khoản').fill('123456789');
      await expect(page.getByLabel('Tên chủ tài khoản')).toHaveValue('NGUYEN VAN A');
      await expect(page.getByLabel('Tên chủ tài khoản')).toHaveAttribute('readonly', '');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`verified-form-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Kiểm tra yêu cầu' }).click();
      await expect(page.getByLabel('Số tài khoản')).toHaveAttribute('readonly', '');
      await page.getByRole('button', { name: 'Xác nhận gửi yêu cầu' }).click();
      await expect(page.getByRole('heading', { name: 'Chi tiết rút tiền' })).toBeVisible();
      await page.getByLabel('Lý do hủy').fill('Không còn nhu cầu rút');
      await page.getByRole('button', { name: 'Hủy yêu cầu rút tiền' }).click();
      await expect(page.getByText('Đã hủy', { exact: false }).first()).toBeVisible();
      await page.keyboard.press('Escape');
    } else {
      await page.goto('/admin/dashboard/gds-withdrawals');
      await expect(page.getByRole('heading', { name: 'Rút tiền GDS' })).toBeVisible();
      await page.getByLabel('Tối thiểu mỗi yêu cầu (VND)').fill('70000');
      await page.getByRole('button', { name: 'Lưu cấu hình hạn mức' }).click();
      await expect(page.getByText('Đã lưu cấu hình hạn mức.')).toBeVisible();
      await page.getByRole('button', { name: 'Xem chi tiết' }).click();
      await page.getByRole('button', { name: 'Duyệt yêu cầu' }).click();
      await page.getByLabel('Lý do / ghi chú đối soát').fill('Đã kiểm tra tài khoản nhận');
      await page.getByRole('button', { name: 'Xác nhận thao tác' }).click();
      await expect(page.getByRole('button', { name: 'Nhận chuyển khoản' })).toBeVisible();
      await page.getByRole('button', { name: 'Xác minh tài khoản nhận' }).click();
      await expect(page.getByText(/✓ Đã xác minh người nhận/)).toBeVisible();
      await page.getByRole('button', { name: 'Nhận chuyển khoản' }).click();
      await page.getByLabel('Lý do / ghi chú đối soát').fill('Đã đối chiếu người nhận và nhận xử lý');
      await page.getByRole('button', { name: 'Xác nhận thao tác' }).click();
      await page.getByRole('button', { name: 'Lấy QR chuyển khoản' }).click();
      await expect(page.getByRole('img', { name: 'QR chuyển khoản yêu cầu withdrawal-1' })).toBeVisible();
      await expect(page.getByText('Quét QR chưa đồng nghĩa đã chuyển tiền.')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`admin-qr-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Xác nhận đã chi', exact: true }).click();
      await page.getByLabel('Mã giao dịch ngân hàng').fill('SYNTHETIC-BANK-REFERENCE');
      const transfer = new Date();
      await page.getByLabel('Thời điểm chuyển khoản').fill(new Date(transfer.getTime() - transfer.getTimezoneOffset() * 60000).toISOString().slice(0, 19));
      await page.getByLabel('Lý do / ghi chú đối soát').fill('Dữ liệu kiểm thử: đã đối chiếu chứng từ ngân hàng');
      await page.getByRole('button', { name: 'Xác nhận thao tác' }).click();
      await expect(page.getByRole('dialog').getByText('Đã chi', { exact: false }).first()).toBeVisible();
      await expect(page.getByRole('img', { name: 'QR chuyển khoản yêu cầu withdrawal-1' })).toHaveCount(0);
      await page.keyboard.press('Escape');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await runtime.assertClean();
    await page.screenshot({ path: test.info().outputPath(`withdrawals-${role}-${width}.png`), fullPage: true });
  });
}
