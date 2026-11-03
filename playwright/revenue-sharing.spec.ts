import { expect, test, type Page } from "@playwright/test";
import { guardRuntime } from "./runtime-guards";
const session = (role: string) => JSON.stringify({ accessToken: "", refreshToken: "", tokenType: "Bearer", expiresIn: 3600, user: { id: "revenue-synthetic", email: "revenue@example.test", fullName: "Kiểm thử chia doanh thu", status: "active", roles: [role], createdAt: "2026-11-03T00:00:00Z", updatedAt: "2026-11-03T00:00:00Z" } });
const json = (data: unknown) => ({ contentType: "application/json", status: 200, body: JSON.stringify({ success: true, message: "OK", data }) });
const terms = [{ id: "terms", title: "Điều khoản hợp tác", body: "Phân bổ theo trọng số. Thay đổi được thông báo; người bán có quyền ngừng tham gia cho đơn mới. Đơn cũ giữ nguyên điều khoản." }];
const report = { items: [{ id: "period", orderId: "Đơn-kiểm-thử-với-mã-rất-dài-để-kiểm-tra-xuống-dòng", orderLineId: "line", sellerId: "seller", courseId: "Khóa-học-có-mã-rất-dài", amountMinor: "180000", pendingAmountMinor: "90000", recognizedAmountMinor: "90000", refundAdjustmentAmountMinor: "-1000", dueAt: "2026-11-30T00:00:00Z" }], totals: { pendingAmountMinor: "90000", recognizedAmountMinor: "90000", refundAdjustmentAmountMinor: "-1000" }, page: 1, pageSize: 25, total: 1, totalPages: 1 };
async function fixtures(page: Page) {
  await page.route("**/api/v1/**", route => route.fulfill(json({ items: [], unreadCount: 0, total: 0, page: 1, totalPages: 0 })));
  await page.route("**/api/v1/admin/revenue-sharing/state", route => route.fulfill(json({ retailPolicies: [], planPolicies: [], terms, plans: [{ id: "gold", code: "GOLD", status: "active", versions: [{ id: "v1", displayName: "Hội viên Vàng", status: "published", versionNumber: 1 }] }] })));
  await page.route("**/api/v1/*/revenue-sharing/report?*", route => route.fulfill(json(report)));
  await page.route("**/api/v1/admin/revenue-sharing/plan-policies/preview", route => route.fulfill(json({ courses: [{ courseId: "course", title: "AI ứng dụng", sellerId: "seller", weight: 1, shareBps: 10000, previousShareBps: 4000 }], totalWeight: 1, previousTotalWeight: 5, affectedSellerCount: 2, removedCourses: [{ courseId: "old", title: "Khóa ngừng tham gia", sellerId: "previous-seller", previousShareBps: 6000 }] })));
  await page.route("**/api/v1/seller/revenue-sharing/courses?*", route => route.fulfill(json({ items: [{ id: "course", title: "Khóa học AI ứng dụng dành cho người mới bắt đầu trong doanh nghiệp", participationStatus: null }], page: 1, pageSize: 25, total: 1, totalPages: 1 })));
  await page.route("**/api/v1/seller/revenue-sharing/courses/course/preview", route => route.fulfill(json({ course: { id: "course", title: "Khóa học AI ứng dụng" }, participation: null, terms, plans: [{ planId: "gold", displayName: "Hội viên Vàng", policyId: "p1", weight: 2, totalWeight: 3, shareBps: 6667, platformFeeBps: 4000, status: "active", isIncluded: false, isMatching: true, effectiveAt: "2026-11-03T00:00:00Z" }] })));
}
for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
  for (const role of ["platform_admin", "instructor"]) {
    test(`revenue sharing ${role} fits ${width}px`, async ({ page }) => {
      await page.addInitScript(value => localStorage.setItem("eduai.auth.session.v1", value), session(role));
      await fixtures(page);
      const runtime = guardRuntime(page);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(role === "platform_admin" ? "/admin/dashboard/revenue-sharing" : "/instructor/dashboard/revenue-sharing");
      await expect(page.getByRole("heading", { level: 1, name: role === "platform_admin" ? "Phí và chia doanh thu" : "Doanh thu và gói hội viên" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Sổ doanh thu" })).toBeVisible();
      if (role === "platform_admin") {
        const form = page.getByRole("heading", { name: "Phí bán lẻ toàn hệ thống" }).locator("..");
        await expect(form.getByLabel("Số ngày báo trước")).toHaveCount(0);
        await form.getByLabel("Báo trước", { exact: true }).check();
        await expect(form.getByLabel("Số ngày báo trước")).toBeVisible();
        await form.getByLabel("Áp dụng ngay sau thông báo").check();
        await expect(form.getByLabel("Số ngày báo trước")).toHaveCount(0);
        const member = page.getByRole("heading", { name: "Chia doanh thu member", exact: true }).locator("..");
        await member.getByLabel("Gói hội viên").selectOption("gold");
        await member.getByLabel("Điều khoản").selectOption("terms");
        await member.getByLabel("Tỷ lệ nền tảng (%)").fill("40");
        await member.getByRole("button", { name: "Xem trước tác động" }).click();
        await expect(member.getByText(/40.00% → 100.00% quỹ người bán/)).toBeVisible();
        await expect(member.getByText(/60.00% → 0.00% quỹ người bán/)).toBeVisible();
        await expect(member.getByRole("button", { name: "Thông báo và áp dụng" })).toBeEnabled();
        await member.getByLabel("Trọng số", { exact: true }).fill("2");
        await expect(member.getByRole("button", { name: "Thông báo và áp dụng" })).toBeDisabled();
      } else {
        await page.getByRole("button", { name: "Xem gói và điều khoản" }).click();
        await expect(page.getByText(terms[0].body)).toBeVisible();
        await expect(page.getByText("Phù hợp, chưa được đưa vào gói")).toBeVisible();
        await expect(page.getByRole("button", { name: "Chấp nhận và tham gia" })).toBeDisabled();
        await page.getByRole("checkbox").check();
        await expect(page.getByRole("button", { name: "Chấp nhận và tham gia" })).toBeEnabled();
      }
      const dimensions = await page.locator("body").evaluate(body => ({ clientWidth: body.clientWidth, scrollWidth: body.scrollWidth }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
      await page.screenshot({ path: `test-results/revenue-${role}-${width}.png`, fullPage: true });
      runtime.assertClean();
    });
  }
}