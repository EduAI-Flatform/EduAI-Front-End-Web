import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BankTransferCheckout } from "./BankTransferCheckout";
import {
  paymentService,
  type PaymentCheckoutState,
} from "../../services/payment.service";
const initial: PaymentCheckoutState = {
  orderId: "demo",
  orderNumber: "EDU-DEMO",
  orderStatus: "PENDING_PAYMENT",
  paymentRequired: true,
  payment: {
    id: "attempt",
    provider: "bank_transfer",
    status: "PENDING",
    amount: { amountMinor: "499000", currency: "VND" },
    expiresAt: "2099-01-01T00:00:00Z",
    qrCodeDataUrl: "data:image/png;base64,ZGVtbw==",
    bankTransfer: {
      bankName: "Demo Bank",
      bankBin: "000000",
      accountNumber: "0000000000",
      beneficiaryName: "TAI KHOAN THU NGHIEM",
      transferContent: "EDUDEMO01",
    },
  },
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe("BankTransferCheckout", () => {
  it("shows server details and copies exact transfer reference without marking paid", async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: copy },
    });
    render(
      <BankTransferCheckout
        state={initial}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
        cancelling={false}
        onStateChange={vi.fn()}
      />,
    );
    expect(screen.getByText("TAI KHOAN THU NGHIEM")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Sao chép Nội dung chuyển khoản" }),
    );
    await waitFor(() => expect(copy).toHaveBeenCalledWith("EDUDEMO01"));
    expect(screen.getByText("Chờ thanh toán")).toBeVisible();
    expect(screen.queryByText("Đã thanh toán")).not.toBeInTheDocument();
  });
  it("removes QR and copy actions when expiry is reached while open", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T00:00:00Z"));
    render(
      <BankTransferCheckout
        state={{
          ...initial,
          payment: { ...initial.payment!, expiresAt: "2026-10-22T00:00:01Z" },
        }}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
        cancelling={false}
        onStateChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("img")).toBeVisible();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Đã hết hạn")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Sao chép Tài khoản nhận" }),
    ).not.toBeInTheDocument();
  });
  it("support requests use canonical response and cannot locally confirm payment", async () => {
    const request = vi
      .spyOn(paymentService, "requestBankTransferSupport")
      .mockResolvedValue({
        ...initial,
        payment: { ...initial.payment!, status: "UNDER_REVIEW" },
      });
    const change = vi.fn();
    render(
      <BankTransferCheckout
        state={initial}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
        cancelling={false}
        onStateChange={change}
      />,
    );
    fireEvent.change(screen.getByLabelText("Lý do tra soát"), {
      target: { value: "Đã chuyển nhưng chưa được nhận diện" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Gửi yêu cầu tra soát" }),
    );
    await waitFor(() =>
      expect(change).toHaveBeenCalledWith(
        expect.objectContaining({
          payment: expect.objectContaining({ status: "UNDER_REVIEW" }),
        }),
      ),
    );
    expect(request).toHaveBeenCalledWith(
      "demo",
      "Đã chuyển nhưng chưa được nhận diện",
    );
    expect(screen.queryByText("Đã thanh toán")).not.toBeInTheDocument();
  });
  it.each([
    "UNDER_REVIEW",
    "NEEDS_SUPPORT",
    "EXPIRED",
    "CANCELLED",
    "LATE_PAID",
  ])("does not invite another transfer in %s", (status) => {
    render(
      <BankTransferCheckout
        state={{ ...initial, payment: { ...initial.payment!, status } }}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
        cancelling={false}
        onStateChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText(/không chuyển thêm tiền/i)).toBeVisible();
  });
  it("fails closed for incomplete beneficiary details or invalid VND", () => {
    render(
      <BankTransferCheckout
        state={{
          ...initial,
          payment: {
            ...initial.payment!,
            amount: { amountMinor: "499.5", currency: "VND" },
          },
        }}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
        cancelling={false}
        onStateChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Thông tin chuyển khoản chưa khả dụng/),
    ).toBeVisible();
  });
});
