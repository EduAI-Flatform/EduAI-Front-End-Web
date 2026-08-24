import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MembershipPlan } from "../../../services/admin-membership.service";
import { AdminMembershipPage } from "./AdminMembershipPage";

const membershipApi = vi.hoisted(() => ({ listPlans: vi.fn(), createPlan: vi.fn(), createVersion: vi.fn(), publishVersion: vi.fn(), archiveVersion: vi.fn(), archivePlan: vi.fn(), listEntitlementDefinitions: vi.fn(), listAvailableCourses: vi.fn(), createEntitlementDefinition: vi.fn(), configureEntitlement: vi.fn(), includeCourse: vi.fn() }));
vi.mock("../../../services/admin-membership.service", async (importOriginal) => ({ ...(await importOriginal<typeof import("../../../services/admin-membership.service")>()), adminMembershipService: membershipApi }));

const plan: MembershipPlan = {
  id: "plan-id", code: "GOLD", status: "ACTIVE", createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T01:00:00.000Z", archivedAt: null,
  versions: [
    { id: "version-2", planId: "plan-id", versionNumber: 2, displayName: "Hội viên Vàng dành cho hành trình học tập chuyên sâu", description: "Quyền lợi dài hạn bằng tiếng Việt với nội dung có thể xuống dòng an toàn trên màn hình nhỏ.", baseMonthlyPriceAmountMinor: "150000", currency: "VND", salesStartAt: null, salesEndAt: null, status: "DRAFT", createdAt: "2026-08-24T01:00:00.000Z", publishedAt: null, archivedAt: null, durationOptions: [{ id: "duration-2", months: 12, pricingMode: "DISCOUNT", priceAmountMinor: null, discountPercent: 60, effectivePriceAmountMinor: "720000", currency: "VND", displayOrder: 0 }], serviceEntitlements: [], includedCourses: [] },
    { id: "version-1", planId: "plan-id", versionNumber: 1, displayName: "Hội viên Vàng", description: null, baseMonthlyPriceAmountMinor: "100000", currency: "VND", salesStartAt: null, salesEndAt: null, status: "PUBLISHED", createdAt: "2026-08-24T00:00:00.000Z", publishedAt: "2026-08-24T00:10:00.000Z", archivedAt: null, durationOptions: [{ id: "duration-1", months: 12, pricingMode: "DISCOUNT", priceAmountMinor: null, discountPercent: 10, effectivePriceAmountMinor: "1080000", currency: "VND", displayOrder: 0 }], serviceEntitlements: [], includedCourses: [] },
  ],
};

describe("AdminMembershipPage", () => {
  beforeEach(() => {
    Object.values(membershipApi).forEach((mock) => mock.mockReset());
    membershipApi.listPlans.mockResolvedValue({ items: [plan], page: 1, pageSize: 20, total: 1, totalPages: 1 });
    membershipApi.listEntitlementDefinitions.mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 0 });
    membershipApi.publishVersion.mockResolvedValue({ ...plan.versions[0], status: "PUBLISHED" });
    membershipApi.listAvailableCourses.mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 0 });
  });

  it("shows immutable history, a clear version diff, long content, and high-discount warning", async () => {
    render(<AdminMembershipPage />);
    expect(await screen.findByRole("heading", { name: plan.versions[0].displayName })).toBeInTheDocument();
    expect(screen.getByText(/Giá tháng: 100\.000 VND → 150\.000 VND/)).toBeInTheDocument();
    expect(screen.getByText(/mức giảm từ 50% trở lên/i)).toBeInTheDocument();
    expect(screen.getByText(/không thể bị sửa ngầm/i)).toBeInTheDocument();
  });

  it("requires destructive confirmation before publishing a draft", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminMembershipPage />);
    await user.click(await screen.findByRole("button", { name: /Xuất bản bất biến/ }));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/lịch sử bất biến/i));
    expect(membershipApi.publishVersion).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: /Xuất bản bất biến/ }));
    await waitFor(() => expect(membershipApi.publishVersion).toHaveBeenCalledWith("version-2"));
    confirm.mockRestore();
  });

  it("builds arbitrary whole-month duration options and warns without capping discounts", async () => {
    const user = userEvent.setup();
    membershipApi.createPlan.mockResolvedValue(plan);
    render(<AdminMembershipPage />);
    await user.click(await screen.findByRole("button", { name: "Tạo gói" }));
    await user.type(screen.getByLabelText("Mã gói"), "platinum");
    await user.type(screen.getByLabelText("Tên hiển thị"), "Bạch kim");
    await user.type(screen.getByLabelText("Giá cơ sở mỗi tháng (đồng)"), "200000");
    await user.clear(screen.getByLabelText("Số tháng 1")); await user.type(screen.getByLabelText("Số tháng 1"), "7");
    await user.clear(screen.getByLabelText("Giảm phần trăm 1")); await user.type(screen.getByLabelText("Giảm phần trăm 1"), "70");
    expect(screen.getByText(/Mức giảm từ 50% trở lên/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
    await waitFor(() => expect(membershipApi.createPlan).toHaveBeenCalledWith(expect.objectContaining({ code: "PLATINUM", durations: [{ months: 7, discountPercent: 70, displayOrder: 0 }] })));
  });

  it("creates a typed service definition with an explicit reset contract", async () => {
    const user = userEvent.setup();
    membershipApi.createEntitlementDefinition.mockResolvedValue({});
    render(<AdminMembershipPage />);
    await user.click(await screen.findByRole("button", { name: /Định nghĩa dịch vụ/ }));
    await user.type(screen.getByLabelText("Mã dịch vụ"), "ai_coach");
    await user.type(screen.getByLabelText("Tên dịch vụ"), "AI Coach");
    await user.type(screen.getByLabelText("Nhãn đơn vị"), "lượt");
    await user.click(screen.getByRole("button", { name: "Tạo định nghĩa" }));
    await waitFor(() => expect(membershipApi.createEntitlementDefinition).toHaveBeenCalledWith(expect.objectContaining({ code: "AI_COACH", valueType: "METERED", resetPeriod: "CALENDAR_MONTH", unitLabel: "lượt" })));
  });

  it("searches the protected course catalog and permits private explicit grants", async () => {
    const user = userEvent.setup();
    membershipApi.listAvailableCourses.mockReset()
      .mockResolvedValueOnce({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 0 })
      .mockResolvedValueOnce({ items: [{ id: "private-course", title: "Private Masterclass", slug: "private-masterclass", visibility: "PRIVATE" }], page: 1, pageSize: 100, total: 1, totalPages: 1 });
    render(<AdminMembershipPage />);
    await user.type(await screen.findByLabelText("Tìm khóa học kèm theo"), "private");
    await user.click(screen.getByRole("button", { name: "Tìm trong khóa học khả dụng" }));
    expect(await screen.findByRole("option", { name: "Private Masterclass · PRIVATE" })).toBeInTheDocument();
    expect(membershipApi.listAvailableCourses).toHaveBeenLastCalledWith("private");
  });
});
