import { getAuthSession } from "./auth.service";
import { ApiClient, ApiClientError } from "./api-client";

export type ScholarshipStatus = "draft" | "active" | "paused" | "closed";
export type ScholarshipApplicationMode = "application" | "automatic";
export type ScholarshipBenefitKind = "course_access" | "percentage_discount" | "fixed_credit";

export interface Scholarship {
  id: string;
  title: string;
  description: string | null;
  status: ScholarshipStatus;
  applicationMode: ScholarshipApplicationMode;
  benefitKind: ScholarshipBenefitKind;
  benefitValue: number;
  currency: string | null;
  startsAt: string;
  endsAt: string;
  quota: number | null;
  awardedCount: number;
  courseIds: string[];
  categorySlugs: string[];
  eligibleUserIds: string[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScholarshipPage {
  items: Scholarship[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ScholarshipEligibility {
  scholarshipId: string;
  courseId: string;
  eligible: boolean;
  reason: string;
}

export interface ScholarshipApplication {
  id: string;
  scholarshipId: string;
  userId: string;
  courseId: string;
  status: "pending" | "awarded" | "rejected" | "revoked";
  decisionReason: string | null;
  appliedAt: string;
  updatedAt: string;
  idempotent: boolean;
  award: {
    id: string;
    benefitKind: ScholarshipBenefitKind;
    benefitValue: number;
    currency: string | null;
    awardedAt: string;
    revokedAt: string | null;
  } | null;
}

export interface ScholarshipApplicationPage {
  items: ScholarshipApplication[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ScholarshipMutationInput {
  title: string;
  description?: string | null;
  applicationMode: ScholarshipApplicationMode;
  benefitKind: ScholarshipBenefitKind;
  benefitValue: number;
  currency?: string | null;
  startsAt: string;
  endsAt: string;
  quota?: number | null;
  courseIds?: string[];
  categorySlugs?: string[];
  eligibleUserIds?: string[];
  status?: ScholarshipStatus;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const scholarshipService = {
  listEligible(courseId: string): Promise<Scholarship[]> {
    return authenticatedApiClient.get<Scholarship[]>(`/scholarships?courseId=${encodeURIComponent(courseId)}`);
  },
  preview(id: string, courseId: string): Promise<ScholarshipEligibility> {
    return authenticatedApiClient.get<ScholarshipEligibility>(`/scholarships/${id}/preview?courseId=${encodeURIComponent(courseId)}`);
  },
  apply(id: string, courseId: string): Promise<ScholarshipApplication> {
    return authenticatedApiClient.post<ScholarshipApplication>(`/scholarships/${id}/applications`, { courseId });
  },
  applications(): Promise<ScholarshipApplicationPage> {
    return authenticatedApiClient.get<ScholarshipApplicationPage>("/me/scholarships/applications");
  },
};

export const adminScholarshipService = {
  list(): Promise<ScholarshipPage> {
    return authenticatedApiClient.get<ScholarshipPage>("/admin/scholarships?page=1&pageSize=20");
  },
  create(input: ScholarshipMutationInput): Promise<Scholarship> {
    return authenticatedApiClient.post<Scholarship>("/admin/scholarships", { ...input });
  },
  update(id: string, input: Partial<ScholarshipMutationInput>): Promise<Scholarship> {
    return authenticatedApiClient.patch<Scholarship>(`/admin/scholarships/${id}`, { ...input });
  },
  applications(id: string): Promise<ScholarshipApplicationPage> {
    return authenticatedApiClient.get<ScholarshipApplicationPage>(`/admin/scholarships/${id}/applications?page=1&pageSize=20`);
  },
};

export function getScholarshipErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return "Vui lòng đăng nhập để tiếp tục.";
    if (error.status === 403) return "Bạn không có quyền thao tác học bổng.";
    if (error.status === 409) return "Chính sách học bổng đã có người nhận và không thể sửa điều kiện.";
    if (error.code.startsWith("SCHOLARSHIP_")) return scholarshipReasonMessage(error.code.replace("SCHOLARSHIP_", "").toLowerCase());
    return error.message;
  }
  return "Không thể tải chính sách học bổng.";
}

export function scholarshipReasonMessage(reason: string): string {
  const messages: Record<string, string> = {
    campaign_not_active: "Chiến dịch học bổng chưa mở.",
    campaign_expired: "Chiến dịch học bổng đã kết thúc.",
    quota_reached: "Học bổng đã hết suất.",
    user_not_eligible: "Tài khoản chưa thuộc nhóm đủ điều kiện.",
    course_scope_not_eligible: "Học bổng không áp dụng cho khóa học này.",
    already_applied: "Bạn đã đăng ký học bổng này.",
    invalid_benefit: "Quyền lợi học bổng không hợp lệ.",
  };
  return messages[reason] ?? "Bạn chưa đủ điều kiện nhận học bổng.";
}
