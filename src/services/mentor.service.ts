import { ApiClient, getApiBaseUrl } from "./api-client";
import { getAuthSession } from "./auth.service";

export type MentorApprovalStatus = "pending" | "approved" | "rejected";
export interface MentorAvailability { dayOfWeek: number; startMinute: number; endMinute: number }
export interface MentorProfile {
  id: string; headline: string; bio: string | null; timezone: string; status?: MentorApprovalStatus; isActive: boolean; approvedAt?: string | null; ratingAverage?: number | null; ratingCount?: number;
  user?: { fullName: string; avatarUrl: string | null };
  expertise: Array<{ name: string }>;
  availability: MentorAvailability[];
}
export interface MentorPage { items: MentorProfile[]; page: number; pageSize: number; total: number; totalPages: number }
export interface UpdateMentorProfileInput { headline: string; bio?: string | null; timezone: string; expertise: string[]; availability: MentorAvailability[] }
export type MentorBookingStatus = "requested" | "accepted" | "reschedule_requested" | "rejected" | "cancelled" | "completed";
export interface MentorBooking {
  id: string; topic: string; scheduledStart: string; scheduledEnd: string; status: MentorBookingStatus; cancellationReason: string | null; createdAt: string; updatedAt: string;
  mentorProfile?: { id: string; headline: string; timezone: string; user: { fullName: string; avatarUrl: string | null } };
  student?: { fullName: string; avatarUrl: string | null };
  history: Array<{ fromStatus: MentorBookingStatus | null; toStatus: MentorBookingStatus; previousScheduledStart: string | null; previousScheduledEnd: string | null; scheduledStart: string; scheduledEnd: string; reason: string | null; createdAt: string }>;
}
export interface MentorBookingPage { items: MentorBooking[]; page: number; pageSize: number; total: number; totalPages: number }
export interface JoinedMentorSession { meetingUrl: string; joinedAt: string; leftAt: string | null }
export interface MentorSessionAttendance { joinedAt: string; leftAt: string | null; durationSeconds: number | null }
export interface MentorOutcome { sharedNote: { content: string; updatedAt: string } | null; privateNote?: { content: string; updatedAt: string } | null; goals: Array<{ id: string; content: string; status: "open" | "completed"; createdAt: string; updatedAt: string }>; review: { rating: number; comment: string | null; createdAt: string; updatedAt: string } | null; rating: { average: number | null; count: number } }

const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });
const params = (filters: { page?: number; search?: string; expertise?: string; timezone?: string; status?: MentorApprovalStatus } = {}) => {
  const query = new URLSearchParams({ page: String(filters.page || 1), pageSize: "20" });
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && key !== "page") query.set(key, String(value)); });
  return query.toString();
};

export const mentorService = {
  getMine(): Promise<MentorProfile | null> { return client.get<MentorProfile | null>("/mentor/profile"); },
  updateMine(input: UpdateMentorProfileInput): Promise<MentorProfile> { return client.put<MentorProfile>("/mentor/profile", { ...input }); },
  setActive(isActive: boolean): Promise<MentorProfile> { return client.patch<MentorProfile>("/mentor/profile/active", { isActive }); },
  list(filters: { page?: number; search?: string; expertise?: string; timezone?: string } = {}): Promise<MentorPage> { return client.get<MentorPage>(`/mentors?${params(filters)}`); },
  requestBooking(mentorId: string, input: { topic: string; scheduledStart: string; scheduledEnd: string }): Promise<MentorBooking> { return client.post<MentorBooking>(`/mentors/${mentorId}/bookings`, input); },
  listStudentBookings(): Promise<MentorBookingPage> { return client.get<MentorBookingPage>("/mentor-bookings?page=1&pageSize=100"); },
  listInstructorBookings(): Promise<MentorBookingPage> { return client.get<MentorBookingPage>("/mentor/bookings?page=1&pageSize=100"); },
  acceptBooking(id: string): Promise<MentorBooking> { return client.patch<MentorBooking>(`/mentor-bookings/${id}/accept`, {}); },
  rejectBooking(id: string, reason: string): Promise<MentorBooking> { return client.patch<MentorBooking>(`/mentor-bookings/${id}/reject`, { reason }); },
  cancelBooking(id: string, reason: string): Promise<MentorBooking> { return client.patch<MentorBooking>(`/mentor-bookings/${id}/cancel`, { reason }); },
  rescheduleBooking(id: string, scheduledStart: string, scheduledEnd: string): Promise<MentorBooking> { return client.patch<MentorBooking>(`/mentor-bookings/${id}/reschedule`, { scheduledStart, scheduledEnd }); },
  joinMentorSession(id: string): Promise<JoinedMentorSession> { return client.post<JoinedMentorSession>(`/mentor-bookings/${id}/session/join`, {}); },
  leaveMentorSession(id: string): Promise<MentorSessionAttendance> { return client.post<MentorSessionAttendance>(`/mentor-bookings/${id}/session/leave`, {}); },
  leaveMentorSessionKeepalive(id: string): void {
    const token = getAuthSession()?.accessToken;
    if (!token) return;
    void fetch(`${getApiBaseUrl().replace(/\/+$/, "")}/mentor-bookings/${id}/session/leave`, {
      body: "{}", headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, keepalive: true, method: "POST",
    }).catch(() => undefined);
  },
  getOutcome(id: string): Promise<MentorOutcome> { return client.get<MentorOutcome>(`/mentor-bookings/${id}/outcomes`); },
  savePrivateNote(id: string, content: string): Promise<unknown> { return client.put(`/mentor-bookings/${id}/private-note`, { content }); },
  saveSharedNote(id: string, content: string): Promise<unknown> { return client.put(`/mentor-bookings/${id}/shared-note`, { content }); },
  createGoal(id: string, content: string): Promise<unknown> { return client.post(`/mentor-bookings/${id}/goals`, { content }); },
  updateGoal(id: string, goalId: string, status: "open" | "completed"): Promise<unknown> { return client.patch(`/mentor-bookings/${id}/goals/${goalId}`, { status }); },
  completeBooking(id: string): Promise<{ status: MentorBookingStatus }> { return client.post(`/mentor-bookings/${id}/complete`, {}); },
  saveReview(id: string, rating: number, comment?: string): Promise<unknown> { return client.put(`/mentor-bookings/${id}/review`, { rating, comment }); },
};

export const adminMentorService = {
  list(status?: MentorApprovalStatus): Promise<MentorPage> { return client.get<MentorPage>(`/admin/mentors?${params({ status })}`); },
  setApproval(id: string, status: Extract<MentorApprovalStatus, "approved" | "rejected">): Promise<MentorProfile> { return client.patch<MentorProfile>(`/admin/mentors/${id}/approval`, { status }); },
};
