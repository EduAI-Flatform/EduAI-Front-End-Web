import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AdminMentorApprovalPage } from "./AdminMentorApprovalPage";
import { InstructorMentorSettingsPage } from "./InstructorMentorSettingsPage";
import { MentorDirectoryPage } from "./MentorDirectoryPage";
import { MentorBookingsPage } from "./MentorBookingsPage";

const mocks = vi.hoisted(() => ({ getMine: vi.fn(), list: vi.fn(), setApproval: vi.fn(), updateMine: vi.fn(), setActive: vi.fn(), listStudentBookings: vi.fn(), listInstructorBookings: vi.fn(), acceptBooking: vi.fn(), rejectBooking: vi.fn(), cancelBooking: vi.fn(), rescheduleBooking: vi.fn(), requestBooking: vi.fn(), joinMentorSession: vi.fn(), leaveMentorSession: vi.fn(), leaveMentorSessionKeepalive: vi.fn() }));
vi.mock("../../services/mentor.service", () => ({ mentorService: { getMine: mocks.getMine, list: mocks.list, updateMine: mocks.updateMine, setActive: mocks.setActive, listStudentBookings: mocks.listStudentBookings, listInstructorBookings: mocks.listInstructorBookings, acceptBooking: mocks.acceptBooking, rejectBooking: mocks.rejectBooking, cancelBooking: mocks.cancelBooking, rescheduleBooking: mocks.rescheduleBooking, requestBooking: mocks.requestBooking, joinMentorSession: mocks.joinMentorSession, leaveMentorSession: mocks.leaveMentorSession, leaveMentorSessionKeepalive: mocks.leaveMentorSessionKeepalive }, adminMentorService: { list: mocks.list, setApproval: mocks.setApproval } }));

const mentor = { id: "mentor-id", headline: "Backend mentor", bio: "Public bio", timezone: "Asia/Ho_Chi_Minh", status: "pending", isActive: false, approvedAt: null, user: { fullName: "Instructor Demo", avatarUrl: null }, expertise: [{ name: "NestJS" }], availability: [{ dayOfWeek: 1, startMinute: 540, endMinute: 600 }] };

describe("mentor role surfaces", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getMine.mockResolvedValue(mentor); mocks.list.mockResolvedValue({ items: [mentor], page: 1, pageSize: 20, total: 1, totalPages: 1 }); mocks.setApproval.mockResolvedValue({ ...mentor, status: "approved" }); mocks.listStudentBookings.mockResolvedValue({ items: [{ id: "booking-id", topic: "Career planning", scheduledStart: "2030-01-01T09:00:00.000Z", scheduledEnd: "2030-01-01T10:00:00.000Z", status: "reschedule_requested", cancellationReason: null, history: [{ toStatus: "requested" }, { toStatus: "reschedule_requested" }], mentorProfile: { user: { fullName: "Instructor Demo" } } }], page: 1, pageSize: 20, total: 1, totalPages: 1 }); mocks.acceptBooking.mockResolvedValue({}); });

  it("shows approved public projection fields without private contact data", async () => {
    render(<MemoryRouter><MentorDirectoryPage /></MemoryRouter>);
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

  it("shows canonical booking time/history and lets the other party accept a proposal", async () => {
    render(<MentorBookingsPage mode="student" />);
    expect(await screen.findByText("Career planning")).toBeInTheDocument();
    expect(screen.getByText("2 thay đổi trạng thái")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Chấp nhận" }));
    await waitFor(() => expect(mocks.acceptBooking).toHaveBeenCalledWith("booking-id"));
  });

  it("reveals a private Jitsi room only after an accepted participant joins and records leave", async () => {
    mocks.listStudentBookings.mockResolvedValue({ items: [{ id: "booking-id", topic: "Career planning", scheduledStart: "2030-01-01T09:00:00.000Z", scheduledEnd: "2030-01-01T10:00:00.000Z", status: "accepted", cancellationReason: null, history: [{ toStatus: "accepted" }], mentorProfile: { user: { fullName: "Instructor Demo" } } }], page: 1, pageSize: 20, total: 1, totalPages: 1 });
    mocks.joinMentorSession.mockResolvedValue({ meetingUrl: "https://meet.jit.si/private-room", joinedAt: "2030-01-01T09:00:00.000Z", leftAt: null });
    mocks.leaveMentorSession.mockResolvedValue({ joinedAt: "2030-01-01T09:00:00.000Z", leftAt: "2030-01-01T10:00:00.000Z", durationSeconds: 3600 });
    render(<MentorBookingsPage mode="student" />);
    fireEvent.click(await screen.findByRole("button", { name: "Vào phòng cố vấn" }));
    expect(await screen.findByTitle("Phòng cố vấn Career planning")).toHaveAttribute("src", "https://meet.jit.si/private-room");
    fireEvent.click(screen.getByRole("button", { name: "Rời phòng cố vấn" }));
    await waitFor(() => expect(mocks.leaveMentorSession).toHaveBeenCalledWith("booking-id"));
  });
});
