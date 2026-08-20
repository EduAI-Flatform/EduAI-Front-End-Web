import { ApiClient } from "./api-client";
import { getAuthSession } from "./auth.service";

export type MentorApprovalStatus = "pending" | "approved" | "rejected";
export interface MentorAvailability { dayOfWeek: number; startMinute: number; endMinute: number }
export interface MentorProfile {
  id: string; headline: string; bio: string | null; timezone: string; status?: MentorApprovalStatus; isActive: boolean; approvedAt?: string | null;
  user?: { fullName: string; avatarUrl: string | null };
  expertise: Array<{ name: string }>;
  availability: MentorAvailability[];
}
export interface MentorPage { items: MentorProfile[]; page: number; pageSize: number; total: number; totalPages: number }
export interface UpdateMentorProfileInput { headline: string; bio?: string | null; timezone: string; expertise: string[]; availability: MentorAvailability[] }

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
};

export const adminMentorService = {
  list(status?: MentorApprovalStatus): Promise<MentorPage> { return client.get<MentorPage>(`/admin/mentors?${params({ status })}`); },
  setApproval(id: string, status: Extract<MentorApprovalStatus, "approved" | "rejected">): Promise<MentorProfile> { return client.patch<MentorProfile>(`/admin/mentors/${id}/approval`, { status }); },
};
