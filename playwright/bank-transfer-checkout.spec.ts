import { expect, test } from "@playwright/test";
import { guardRuntime, assertNoStitchData } from "./runtime-guards";
const session = JSON.stringify({
  accessToken: "",
  refreshToken: "",
  tokenType: "Bearer",
  expiresIn: 3600,
  user: {
    id: "vnpay-student",
    email: "student@example.com",
    fullName: "VNPay student",
    status: "active",
    roles: ["student"],
    createdAt: "2026-08-25T00:00:00.000Z",
    updatedAt: "2026-08-25T00:00:00.000Z",
  },
});

for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
  test("manual bank checkout responsive " + width, async ({ page }) => {
    await page.addInitScript(
      (value) => window.localStorage.setItem("eduai.auth.session.v1", value),
      session,
    );
    await installFixtures(page);
    const runtime = guardRuntime(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/orders/bank-order-id");
    const panel = page.locator(".bank-transfer-checkout");
    await expect(
      panel.getByRole("heading", { name: "Chuyển khoản ngân hàng bằng mã QR" }),
    ).toBeVisible();
    await expect(panel.getByRole("img")).toBeVisible();
    await expect(
      panel.getByText("Chế độ thử nghiệm — không chuyển tiền thật."),
    ).toBeVisible();
    await expect(panel.getByText("EDUDEMO01", { exact: true })).toBeVisible();
    const dimensions = await page.locator("body").evaluate((body) => ({
      client: body.clientWidth,
      scroll: body.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
    const size = await panel.getByRole("img").boundingBox();
    expect(size!.width).toBeLessThanOrEqual(240);
    expect(size!.width).toBeGreaterThan(150);
    await page.screenshot({
      path: "test-results/bank-transfer-top-" + width + ".png",
    });
    await panel
      .getByRole("img")
      .evaluate((img) => img.scrollIntoView({ block: "center", behavior: "instant" }));
    expect(
      await panel.getByRole("img").evaluate((img) => {
        const r = img.getBoundingClientRect();
        return [
          [r.x + 2, r.y + 2],
          [r.right - 2, r.y + 2],
          [r.x + 2, r.bottom - 2],
          [r.right - 2, r.bottom - 2],
          [r.x + r.width / 2, r.y + r.height / 2],
        ].every(([x, y]) => document.elementFromPoint(x, y) === img);
      }),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/bank-transfer-" + width + ".png",
    });
    for (const button of await panel.getByRole("button").all()) {
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    }
    await panel.getByRole("button", { name: "Kiểm tra trạng thái" }).focus();
    await expect(
      panel.getByRole("button", { name: "Kiểm tra trạng thái" }),
    ).toBeFocused();

    await panel
      .getByText("Đã chuyển tiền nhưng chưa được ghi nhận?", { exact: true })
      .click();
    await panel
      .getByLabel("Lý do tra soát")
      .fill("Demo: cần kiểm tra giao dịch thử nghiệm");
    await panel.getByRole("button", { name: "Gửi yêu cầu tra soát" }).click();
    await expect(
      panel.getByText("Đang đối soát", { exact: true }),
    ).toBeVisible();
    await expect(panel.getByRole("img")).toHaveCount(0);
    await expect(panel.getByText("Đã thanh toán", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("link", { name: "Đi tới khu vực học tập" }),
    ).toHaveCount(0);
    await assertNoStitchData(page);
    runtime.assertClean();
  });
}
test("server-enabled method selection creates explicit bank request through the real service", async ({
  page,
}) => {
  await page.addInitScript(
    (value) => window.localStorage.setItem("eduai.auth.session.v1", value),
    session,
  );
  await installFixtures(page, true);
  const runtime = guardRuntime(page);
  await page.goto("/orders/bank-order-id");
  await page.getByLabel("Phương thức thanh toán").selectOption("bank_transfer");
  await page.getByRole("button", { name: /Thanh toán 200/ }).click();
  await expect(
    page.locator(".bank-transfer-checkout").getByRole("img"),
  ).toBeVisible();
  runtime.assertClean();
});

async function installFixtures(
  page: import("@playwright/test").Page,
  withoutPayment = false,
) {
  const json = (data: unknown, status = 200) => ({
    contentType: "application/json",
    status,
    body: JSON.stringify({ success: true, message: "OK", data }),
  });
  const paymentState = {
    orderId: "bank-order-id",
    orderNumber: "EDU-COURSE-BANK",
    orderStatus: "PENDING_PAYMENT",
    paymentRequired: true,
    payment: {
      id: "bank-attempt-id",
      status: "PENDING",
      amount: { amountMinor: "200000", currency: "VND" },
      expiresAt: "2028-08-26T12:00:00.000Z",
      provider: "bank_transfer",
      qrCodeDataUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwCAYAAAA+VemSAAAAAklEQVR4AewaftIAAAWKSURBVO3BwXEjSRAEwcgy6K9y3krQeDSHQB3DPf0HSSsNktYaJK01SFprkLTWIGmtQdJag6S1BklrDZLWGiStNUhaa5C01iBprUHSWoOktQZJa734AUn4C9pyKwknbfl2SThpy60k/AVtuTFIWmuQtNYgaa1B0lqDpLUGSWsNktZ68QvaskESbiThnbY8KQnvtOUkCSdt+bS2bJCEJw2S1hokrTVIWmuQtNYgaa1B0lqDpLUGSWu9+BJJeFJbvkESTtpykoRbSThpy0kSbrXlaUl4Uls+bZC01iBprUHSWoOktQZJaw2S1hokrfVCv6otJ0k4acvTkqAdBklrDZLWGiStNUhaa5C01iBprUHSWi/0Y9ryThJO2nKShJO23GrLSRJO2qLfMUhaa5C01iBprUHSWoOktQZJaw2S1nrxJdoiSMKNJLzTlpMknLTlJAnvtOVpbfm/GyStNUhaa5C01iBprUHSWoOktQZJaw2S1nrxC5LwFyThnbacJOGkLSdJ+AuSIBgkrTVIWmuQtNYgaa1B0lqDpLUGSWul/6AfkYRbbTlJwklbnpaEk7bodwyS1hokrTVIWmuQtNYgaa1B0lqDpLVe/IAknLRlgySctOVWW06ScNKWW0l4UhKe1pZbSXhaW540SFprkLTWIGmtQdJag6S1BklrDZLWGiSt9eIHtOVWEm605SQJ77Tl2yXhVltuJOGkLRu05SQJJ235tEHSWoOktQZJaw2S1hokrTVIWmuQtNaL/4kk3ErCSVv+giTcSMKttjwtCSdt+XaDpLUGSWsNktYaJK01SFprkLTWIGmtFz8gCbfa8u2ScNKWp7XlJAnvJOGkLSdJeFoSbrXlRhJO2vJpg6S1BklrDZLWGiStNUhaa5C01iBprfQfvkAS/oK23EjCrbZ8WhJutOVpSbjVlicNktYaJK01SFprkLTWIGmtQdJag6S1BklrvfgBSfi0tjwtCSdtuZWEk7Y8LQknbbnVlhtJeKctN9pykoRPGyStNUhaa5C01iBprUHSWoOktQZJa734BW25lYSnJeFpSThpy0kSvl0S3mnLSRI+LQknbXknCSdtuTFIWmuQtNYgaa1B0lqDpLUGSWsNktZ68SWScCMJt9rytLacJOFGW24l4SQJn9aWd5Jw0paTtny7QdJag6S1BklrDZLWGiStNUhaa5C01ov/ibacJOGdJNxoywZJOGnLSRJuJeFGEm4l4UZb3mnLkwZJaw2S1hokrTVIWmuQtNYgaa1B0lqDpLXSf9CPSMI7bXlSEt5py0kSntaWpyXhpC0nSThpy6cNktYaJK01SFprkLTWIGmtQdJag6S10n+4lIS/oC2floSTtjwtCbfacpKEk7a8k4RPa8uTBklrDZLWGiStNUhaa5C01iBprUHSWi9+QVs2SMLTknCjLSdJeFpbTpJwqy2f1pZbSThpy41B0lqDpLUGSWsNktYaJK01SFprkLTWIGmtF18iCU9qyzdoy0kSntaWkyScJOFWEj6tLSdJOGnLpw2S1hokrTVIWmuQtNYgaa1B0lqDpLVe6Fcl4aQtN9rytLbcSsKNttxKwo0kfNogaa1B0lqDpLUGSWsNktYaJK01SFrrhVZJwq223EjCpyXhnbbcaMutJDxpkLTWIGmtQdJag6S1BklrDZLWGiSt9eJLtEWQhBttudWWkyTcastJEk7acqstT2vLkwZJaw2S1hokrTVIWmuQtNYgaa1B0lqDpLVe/IIk/AVJeKctT0rC09pykoR3knDSlpMkvNOWkySctOUkCbfacmOQtNYgaa1B0lqDpLUGSWsNktYaJK2V/oOklQZJaw2S1hokrTVIWmuQtNYgaa1B0lqDpLUGSWsNktYaJK01SFprkLTWIGmtQdJa/wFdb4ULUZBJQQAAAABJRU5ErkJggg==",
      bankTransfer: {
        bankName: "Demo Bank",
        bankBin: "000000",
        accountNumber: "0000000000",
        beneficiaryName: "EDUAI SANDBOX",
        transferContent: "EDUDEMO01",
      },
    },
  };
  const order = {
    id: "bank-order-id",
    orderNumber: "EDU-COURSE-BANK",
    status: "PENDING_PAYMENT",
    fulfillmentStatus: "NOT_STARTED",
    subtotal: { amountMinor: "200000", currency: "VND" },
    discount: { amountMinor: "0", currency: "VND" },
    payable: { amountMinor: "200000", currency: "VND" },
    paymentRequired: true,
    lines: [
      {
        id: "course-line-id",
        productType: "COURSE",
        productReferenceId: "course-id",
        title: "Khóa học VNPay",
        quantity: 1,
        unitListPrice: { amountMinor: "200000", currency: "VND" },
        finalPrice: { amountMinor: "200000", currency: "VND" },
      },
    ],
    payment: {
      id: "bank-attempt-id",
      status: "PENDING",
      amount: { amountMinor: "200000", currency: "VND" },
      expiresAt: "2028-08-26T12:00:00.000Z",
      createdAt: "2026-09-10T00:00:00.000Z",
    },
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    confirmedAt: null,
    cancelledAt: null,
    expiredAt: null,
  };

  if (withoutPayment) (order as { payment: unknown }).payment = null;
  await page.route("**/api/v1/notifications/unread-count", (route) =>
    route.fulfill(json({ unreadCount: 0 })),
  );
  await page.route("**/api/v1/commerce/orders/bank-order-id", (route) =>
    route.fulfill(json(order)),
  );
  await page.route("**/api/v1/payments/methods", (route) =>
    route.fulfill(json({ methods: ["bank_transfer"] })),
  );
  await page.route(
    "**/api/v1/payments/orders/bank-order-id/bank-transfer/support",
    (route) => {
      expect(route.request().method()).toBe("POST");
      expect(route.request().headers()["idempotency-key"]).toBeTruthy();
      paymentState.payment.status = "UNDER_REVIEW";
      return route.fulfill(json({}));
    },
  );
  await page.route(
    "**/api/v1/payments/orders/bank-order-id/request",
    (route) => {
      if (route.request().method() === "POST") {
        expect(route.request().postDataJSON()).toEqual({
          provider: "bank_transfer",
        });
        expect(route.request().headers()["idempotency-key"]).toBeTruthy();
        (order as { payment: unknown }).payment = {
          id: "bank-attempt-id",
          status: "PENDING",
          amount: paymentState.payment.amount,
          expiresAt: paymentState.payment.expiresAt,
        };
      }
      return route.fulfill(json(paymentState));
    },
  );
}
