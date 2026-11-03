import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanPolicyEditor } from "./PlanPolicyEditor";
import { ActivationFields } from "./RevenueShared";
import { SellerRevenueSharingPage } from "./SellerRevenueSharingPage";
import type { RevenueState } from "../../services/revenue-sharing.service";
const api = vi.hoisted(() => ({ previewPolicy: vi.fn(), schedulePolicy: vi.fn(), courses: vi.fn(), previewCourse: vi.fn(), accept: vi.fn(), leave: vi.fn(), report: vi.fn() }));
vi.mock("../../services/revenue-sharing.service", async (original) => ({ ...await original<typeof import("../../services/revenue-sharing.service")>(), revenueSharingService: api }));
const state: RevenueState = { retailPolicies: [], planPolicies: [], terms: [{ id: "terms", title: "Hợp tác", body: "Điều khoản minh bạch" }], plans: [{ id: "gold", code: "GOLD", status: "active", versions: [{ id: "version", displayName: "Vàng", status: "published", versionNumber: 1 }] }] };
beforeEach(() => { vi.clearAllMocks(); api.report.mockResolvedValue({ items: [], totals: { pendingAmountMinor: "0", recognizedAmountMinor: "0", refundAdjustmentAmountMinor: "0" }, page: 1, pageSize: 25, total: 0, totalPages: 0 }); });

describe("revenue sharing forms", () => {
  it("does not ask for notice days in immediate mode", () => {
    const change = vi.fn(); const { rerender } = render(<ActivationFields mode="immediate" days="7" onChange={change} />);
    expect(screen.queryByLabelText("Số ngày báo trước")).not.toBeInTheDocument();
    rerender(<ActivationFields mode="delayed" days="7" onChange={change} />);
    expect(screen.getByLabelText("Số ngày báo trước")).toBeRequired();
  });
  it("requires preview and invalidates it when commercial inputs change", async () => {
    api.previewPolicy.mockResolvedValue({ courses: [{ courseId: "course", title: "AI", sellerId: "seller", weight: 1, shareBps: 10000, previousShareBps: 1000 }], totalWeight: 1, previousTotalWeight: 10, affectedSellerCount: 2, removedCourses: [{ courseId: "removed", title: "Khóa được loại", sellerId: "other-seller", previousShareBps: 9000 }] });
    const onSaved = vi.fn(); render(<PlanPolicyEditor state={state} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("Gói hội viên"), { target: { value: "gold" } });
    fireEvent.change(screen.getByLabelText("Điều khoản"), { target: { value: "terms" } });
    fireEvent.change(screen.getByLabelText("Tỷ lệ nền tảng (%)"), { target: { value: "20.15" } });
    expect(screen.getByRole("button", { name: "Thông báo và áp dụng" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Xem trước tác động" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Thông báo và áp dụng" })).toBeEnabled());
    expect(screen.getByText(/10.00% → 100.00% quỹ người bán/)).toBeVisible();
    expect(screen.getByText(/90.00% → 0.00% quỹ người bán/)).toBeVisible();
    expect(api.previewPolicy).toHaveBeenCalledWith(expect.objectContaining({ platformFeeBps: 2015, noticeMode: "immediate" }));
    expect(api.previewPolicy.mock.calls[0][0]).not.toHaveProperty("noticeDays");
    fireEvent.change(screen.getByLabelText("Trọng số"), { target: { value: "2" } });
    expect(screen.getByRole("button", { name: "Thông báo và áp dụng" })).toBeDisabled();
    expect(api.schedulePolicy).not.toHaveBeenCalled();
  });
  it("rejects inverted price ranges before preview", () => {
    render(<PlanPolicyEditor state={state} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Gói hội viên"), { target: { value: "gold" } });
    fireEvent.change(screen.getByLabelText("Điều khoản"), { target: { value: "terms" } });
    fireEvent.change(screen.getByLabelText("Tỷ lệ nền tảng (%)"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Giá tối thiểu (đ)"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Giá tối đa (đ)"), { target: { value: "50" } });
    expect(screen.getByRole("button", { name: "Xem trước tác động" })).toBeDisabled();
  });
  it("shows unmatched courses and requires explicit acceptance of readable terms", async () => {
    api.courses.mockResolvedValue({ items: [{ id: "course", title: "Khóa AI" }], page: 1, pageSize: 25, total: 1, totalPages: 1 });
    api.previewCourse.mockResolvedValue({ course: { id: "course", title: "Khóa AI" }, participation: null, terms: state.terms, plans: [] });
    api.accept.mockResolvedValue({}); render(<SellerRevenueSharingPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Xem gói và điều khoản" }));
    expect(await screen.findByText(/Chưa có gói phù hợp/)).toBeVisible();
    expect(screen.getByText("Điều khoản minh bạch")).toBeVisible();
    expect(screen.getByRole("button", { name: "Chấp nhận và tham gia" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Chấp nhận và tham gia" }));
    await waitFor(() => expect(api.accept).toHaveBeenCalledWith("course", "terms"));
  });
  it("distinguishes included, merely matching and scheduled removal plans", async () => {
    api.courses.mockResolvedValue({ items: [{ id: "course", title: "Khóa AI" }], page: 1, pageSize: 25, total: 1, totalPages: 1 });
    const base = { planId: "plan", weight: 1, totalWeight: 2, shareBps: 5000, platformFeeBps: 2000, effectiveAt: "2026-11-03T00:00:00Z" };
    api.previewCourse.mockResolvedValue({ course: { id: "course", title: "Khóa AI" }, participation: { status: "active", termsId: "terms" }, terms: state.terms, plans: [
      { ...base, policyId: "actual", displayName: "Đã xếp", status: "active", isIncluded: true, isMatching: true },
      { ...base, policyId: "match", displayName: "Đang chờ xếp", status: "active", isIncluded: false, isMatching: true },
      { ...base, policyId: "remove", displayName: "Sắp loại", status: "scheduled", isIncluded: false, isMatching: false, weight: 0, shareBps: 0 },
      { ...base, policyId: "future", displayName: "Sắp thêm", status: "scheduled", isIncluded: false, isMatching: true },
    ] });
    render(<SellerRevenueSharingPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Xem gói và điều khoản" }));
    expect(await screen.findByText(/Đang trong gói/)).toBeVisible();
    expect(screen.getByText("Phù hợp, chưa được đưa vào gói")).toBeVisible();
    expect(screen.getByText(/Sắp ngừng tham gia/)).toBeVisible();
    expect(screen.getByText(/Sắp áp dụng/)).toBeVisible();
    expect(screen.queryByText(/^Đang áp dụng/)).not.toBeInTheDocument();
  });
  it("resets consent when switching the selected course", async () => {
    api.courses.mockResolvedValue({ items: [{ id: "a", title: "A" }, { id: "b", title: "B" }], page: 1, totalPages: 1 });
    let resolveA!: (value: unknown) => void;
    api.previewCourse.mockImplementation((id: string) => id === "a" ? new Promise(resolve => { resolveA = resolve; }) : Promise.resolve({ course: { id: "b", title: "B" }, terms: state.terms, participation: null, plans: [] }));
    render(<SellerRevenueSharingPage />);
    const buttons = await screen.findAllByRole("button", { name: "Xem gói và điều khoản" });
    fireEvent.click(buttons[0]);
    await act(async () => { resolveA({ course: { id: "a", title: "A" }, terms: state.terms, participation: null, plans: [] }); });
    fireEvent.click(buttons[1]);
    await waitFor(() => expect(screen.getByRole("heading", { level: 2, name: "B" })).toBeVisible());
    expect(within(screen.getByRole("heading", { level: 2, name: "B" }).closest("section")!).getByRole("checkbox")).not.toBeChecked();
  });
});