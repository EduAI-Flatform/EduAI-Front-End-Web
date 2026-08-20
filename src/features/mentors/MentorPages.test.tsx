import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminMentorApprovalPage } from "./AdminMentorApprovalPage";
import { InstructorMentorSettingsPage } from "./InstructorMentorSettingsPage";
import { MentorDirectoryPage } from "./MentorDirectoryPage";

const mocks = vi.hoisted(() => ({ getMine: vi.fn(), list: vi.fn(), setApproval: vi.fn(), updateMine: vi.fn(), setActive: vi.fn() }));
vi.mock("../../services/mentor.service", () => ({ mentorService: { getMine: mocks.getMine, list: mocks.list, updateMine: mocks.updateMine, setActive: mocks.setActive }, adminMentorService: { list: mocks.list, setApproval: mocks.setApproval } }));

const mentor = { id: "mentor-id", headline: "Backend mentor", bio: "Public bio", timezone: "Asia/Ho_Chi_Minh", status: "pending", isActive: false, approvedAt: null, user: { fullName: "Instructor Demo", avatarUrl: null }, expertise: [{ name: "NestJS" }], availability: [{ dayOfWeek: 1, startMinute: 540, endMinute: 600 }] };

describe("mentor role surfaces", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getMine.mockResolvedValue(mentor); mocks.list.mockResolvedValue({ items: [mentor], page: 1, pageSize: 20, total: 1, totalPages: 1 }); mocks.setApproval.mockResolvedValue({ ...mentor, status: "approved" }); });

  it("shows approved public projection fields without private contact data", async () => {
    render(<MentorDirectoryPage />);
    expect(await screen.findByText("Instructor Demo")).toBeInTheDocument();
    expect(screen.getByText("NestJS")).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it("keeps activation unavailable while the instructor profile is pending", async () => {
    render(<InstructorMentorSettingsPage />);
    expect(await screen.findByDisplayValue("Asia/Ho_Chi_Minh")).toBeInTheDocument();
    expect(screen.getByText(/pending/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mentor mode/i })).not.toBeInTheDocument();
  });

  it("lets administrators approve a mentor profile", async () => {
    render(<AdminMentorApprovalPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Duyệt" }));
    await waitFor(() => expect(mocks.setApproval).toHaveBeenCalledWith("mentor-id", "approved"));
  });
});
