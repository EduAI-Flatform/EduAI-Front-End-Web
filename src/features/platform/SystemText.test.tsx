import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformProvider, usePlatform } from "./PlatformProvider";
import { SystemText, useSystemMessages } from "./SystemText";
import { CourseCard } from "../courses/CourseCard/CourseCard";
import { AdminUserTable } from "../dashboard/AdminDashboard/AdminUserTable";
import type { CourseSummary } from "../../services/course.service";
import { currentSystemLocale } from './translate-system-message';

vi.mock("../../services/api-client", () => ({
  apiClient: { get: vi.fn().mockResolvedValue({ settings: {} }) },
}));

function LocaleSwitch() {
  const { locale, setLocale } = usePlatform();
  return <button onClick={() => setLocale(locale === "vi" ? "en" : "vi")}>Switch language</button>;
}
function Labels() {
  const message = useSystemMessages();
  return <><SystemText message="Quản lý thanh toán QR" /><input aria-label={message("Số tiền rút (VND)")} /></>;
}
function FormattedValue() {
  usePlatform();
  return <output>{new Intl.NumberFormat(currentSystemLocale()).format(1234.5)}</output>;
}
const course: CourseSummary = {
  id: "original-title", title: "Trạng thái", slug: "original-title",
  description: "Nội dung do giảng viên viết", thumbnailUrl: "/course.png",
  level: "beginner", status: "published", visibility: "public", badge: "Lưu",
  featuredRank: null, price: null,
  instructor: { id: "teacher", fullName: "Nguyễn Văn An", avatarUrl: null, headline: null },
  metrics: { lessonCount: 1, durationMinutes: 60, enrollmentCount: 1, ratingAverage: null, ratingCount: 0 },
  createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

describe("system UI localization boundary", () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.lang = "vi"; });
  afterEach(() => { localStorage.clear(); document.documentElement.lang = "vi"; });
  it('formats persisted locale on first render and switches without a stale render', () => {
    localStorage.setItem('gds.locale.v1', 'en');
    render(<PlatformProvider><LocaleSwitch /><FormattedValue /></PlatformProvider>);
    expect(screen.getByRole('status')).toHaveTextContent('1,234.5');
    act(() => screen.getByRole('button').click());
    expect(screen.getByRole('status')).toHaveTextContent('1.234,5');
  });
  it("updates visible messages and accessible labels immediately in both directions", async () => {
    render(<PlatformProvider><LocaleSwitch /><Labels /></PlatformProvider>);
    expect(screen.getByText("Quản lý thanh toán QR")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Số tiền rút (VND)" })).toBeInTheDocument();
    act(() => screen.getByRole("button").click());
    expect(screen.getByText("Manage QR payments")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Withdrawal amount (VND)" })).toBeInTheDocument();
    act(() => screen.getByRole("button").click());
    expect(screen.getByText("Quản lý thanh toán QR")).toBeInTheDocument();
  });
  it("translates course controls and level while preserving instructor-authored catalog words", () => {
    localStorage.setItem("gds.locale.v1", "en");
    render(<PlatformProvider><MemoryRouter><CourseCard course={course} /></MemoryRouter></PlatformProvider>);
    expect(screen.getByRole("heading", { name: "Trạng thái" })).toBeInTheDocument();
    expect(screen.getByText("Lưu")).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(screen.getByText("Beginner")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Course image: Trạng thái");
    expect(screen.getByRole("link")).toHaveAccessibleName("View course details: Trạng thái");
  });
  it("translates imported admin status labels and mobile table labels without translating account names", () => {
    localStorage.setItem("gds.locale.v1", "en");
    const { container } = render(<PlatformProvider><AdminUserTable items={[{
      id: "user", email: "user@example.com", fullName: "Hoạt động", status: "active", authProvider: "local",
      emailVerified: false, createdAt: "2026-01-01", updatedAt: "2026-01-01", roles: ["student"],
    }]} onSelect={() => {}} /></PlatformProvider>);
    expect(screen.getByText("Hoạt động")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Learner")).toBeInTheDocument();
    expect(screen.getByText("Not verified")).toBeInTheDocument();
    expect(container.querySelector('td[data-label="Status"]')).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAccessibleName("View details: Hoạt động");
  });

  it("relocalizes a known service message already stored in English and preserves unknown failures", () => {
    localStorage.setItem("gds.locale.v1", "en");
    render(<PlatformProvider><LocaleSwitch /><p><SystemText message="Unable to load notifications. Please try again." /></p><p><SystemText message="External failure X-982" /></p></PlatformProvider>);
    expect(screen.getByText("Unable to load notifications. Please try again.")).toBeInTheDocument();
    act(() => screen.getByRole("button").click());
    expect(screen.getByText("Không thể tải thông báo. Vui lòng thử lại.")).toBeInTheDocument();
    expect(screen.getByText("External failure X-982")).toBeInTheDocument();
    act(() => screen.getByRole("button").click());
    expect(screen.getByText("Unable to load notifications. Please try again.")).toBeInTheDocument();
  });

});
