import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "../../services/auth.service";
import Header from "./header";

const state = vi.hoisted(() => ({
  session: null as AuthSession | null,
  setLocale: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn(),
  navigation: [
    ["courses", "Khóa học", "/courses"], ["learning", "Học tập", "/dashboard"],
    ["library", "Thư viện", "/library"], ["ai", "AI", "/ai"],
    ["jobs", "Việc làm", "/jobs"], ["activities", "Hoạt động", "/activities"],
    ["certificates", "Chứng chỉ", "/dashboard/certificates"], ["partners", "Liên kết với GDS", "/partners"],
  ].map(([id, label, path]) => ({ id, label: { vi: label, en: label }, path, enabled: true })),
}));
vi.mock("../../features/auth/auth-store", () => ({ clearAuthSession: state.clear, useAuthSession: () => state.session }));
vi.mock("../../services/auth.service", () => ({ authService: { logout: state.logout } }));
vi.mock("../../features/platform/PlatformProvider", () => ({
  usePlatform: () => ({
    settings: { branding: { name: "GDS", logoUrl: "/gds-logo.png" }, navigation: state.navigation },
    locale: "vi", setLocale: state.setLocale,
  })
}));
vi.mock("../../features/notifications/NotificationCenter", () => ({ NotificationCenter: () => <button data-testid="header-notification">Thông báo</button> }));
vi.mock("../../features/pwa/PwaInstallButton", () => ({ PwaInstallButton: () => <button>Download WebApp</button> }));

const session: AuthSession = {
  accessToken: "synthetic-access", refreshToken: "synthetic-refresh", tokenType: "Bearer", expiresIn: 900,
  user: { id: "student-id", email: "student@example.test", fullName: "Student Example", roles: ["student"], status: "active", createdAt: "2026-11-11", updatedAt: "2026-11-11" },
};
function show(path = "/") {
  return render(<MemoryRouter initialEntries={[path]}>
    <Header />
  </MemoryRouter>);
}
afterEach(() => { state.session = null; state.navigation.forEach(item => { item.enabled = true; }); vi.clearAllMocks(); });

describe("GDS configured header", () => {
  it("uses the official logo and configured navigation order without the legacy package-sales entry", () => {
    show();
    expect(screen.getByRole("img", { name: "GDS" })).toHaveAttribute("src", "/gds-logo.png");
    const desktop = document.querySelector(".app-header__nav") as HTMLElement;
    expect(within(desktop).getAllByRole("link").map(link => link.textContent)).toEqual([
      "Khóa học", "Học tập", "Thư viện", "AI", "Việc làm", "Hoạt động", "Chứng chỉ", "Liên kết với GDS",
    ]);
    expect(within(desktop).queryByRole("link", { name: "Gói thành viên" })).not.toBeInTheDocument();
  });
  it("honors disabled navigation and keeps nested destinations active", () => {
    state.navigation.find(item => item.id === "jobs")!.enabled = false;
    show("/ai/tools");
    const desktop = document.querySelector(".app-header__nav") as HTMLElement;
    expect(within(desktop).queryByRole("link", { name: "Việc làm" })).not.toBeInTheDocument();
    expect(within(desktop).getByRole("link", { name: "AI" })).toHaveAttribute("aria-current", "page");
  });
  it("offers the final three destinations in the mobile More disclosure", async () => {
    const user = userEvent.setup();
    show();
    const mobile = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(within(mobile).getAllByRole("link")).toHaveLength(5);
    await user.click(within(mobile).getByRole("button", { name: "Thêm" }));
    const extra = document.getElementById("gds-mobile-more")!;
    expect(within(extra).getByRole("link", { name: "Liên kết với GDS" })).toHaveAttribute("href", "/partners");
    await user.keyboard("{Escape}");
    expect(document.getElementById("gds-mobile-more")).toBeNull();
  });
  it("opens account details with profile and billing and logs out this session", async () => {
    state.session = session;
    const user = userEvent.setup();
    show("/courses");
    await user.click(screen.getByText("Student Example", { selector: ".app-header__user-name" }));
    const account = document.querySelector(".app-header__account-panel") as HTMLElement;
    expect(within(account).getByText("student@example.test")).toBeInTheDocument();
    expect(within(account).getByRole("link", { name: "Hồ sơ" })).toHaveAttribute("href", "/dashboard/profile");
    expect(within(account).getByRole("link", { name: "Thanh toán" })).toHaveAttribute("href", "/billing");
    expect(screen.getByTestId("header-notification")).toBeInTheDocument();
    await user.click(within(account).getByRole("button", { name: "Đăng xuất" }));
    expect(state.logout).toHaveBeenCalledWith("synthetic-refresh");
    expect(state.clear).toHaveBeenCalledOnce();
  });
  it("places install, account, language and notifications in the requested order", () => {
    state.session = session;
    show();
    const actions = document.querySelector(".app-header__actions")!;
    expect([...actions.children].map(child => child.tagName)).toEqual(["BUTTON", "DETAILS", "LABEL", "BUTTON"]);
  });
  it('opens the common personal profile for instructor accounts', async () => {
    state.session = { ...session, user: { ...session.user, roles: ['instructor'] } };
    show();
    await userEvent.setup().click(screen.getByText('Student Example', { selector: '.app-header__user-name' }));
    expect(screen.getByRole('link', { name: 'Hồ sơ' })).toHaveAttribute('href', '/profile');
  });
  it("passes a language selection to the shared locale provider", async () => {
    const user = userEvent.setup();
    show();
    await user.selectOptions(screen.getByRole("combobox", { name: "Ngôn ngữ" }), "en");
    expect(state.setLocale).toHaveBeenCalledWith("en");
  });
});
