import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export type MembershipPlanStatus = "ACTIVE" | "ARCHIVED";
export type MembershipVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type EntitlementValueType = "BOOLEAN" | "METERED" | "UNLIMITED";
export type EntitlementResetPeriod = "NONE" | "CALENDAR_MONTH" | "MEMBERSHIP_TERM";

export interface MembershipDurationOption {
  id: string;
  months: number;
  pricingMode: "DISCOUNT" | "FIXED_PRICE";
  priceAmountMinor: string | null;
  discountPercent: number | null;
  effectivePriceAmountMinor: string;
  currency: "VND";
  displayOrder: number;
}

export interface ServiceEntitlementDefinition {
  id: string;
  code: string;
  valueType: EntitlementValueType;
  resetPeriod: EntitlementResetPeriod;
  displayName: string;
  description: string | null;
  unitLabel: string | null;
  displayOrder: number;
}

export interface MembershipPlanEntitlement {
  id: string;
  versionId: string;
  definition: ServiceEntitlementDefinition;
  booleanValue: boolean | null;
  quota: string | null;
}

export interface MembershipIncludedCourse {
  id: string;
  versionId: string;
  graceDays: number;
  course: { id: string; title: string; slug: string };
}

export interface MembershipPlanVersion {
  id: string;
  planId: string;
  versionNumber: number;
  displayName: string;
  description: string | null;
  baseMonthlyPriceAmountMinor: string;
  currency: "VND";
  salesStartAt: string | null;
  salesEndAt: string | null;
  status: MembershipVersionStatus;
  createdAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
  durationOptions: MembershipDurationOption[];
  serviceEntitlements: MembershipPlanEntitlement[];
  includedCourses: MembershipIncludedCourse[];
}

export interface MembershipPlan {
  id: string;
  code: string;
  status: MembershipPlanStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  versions: MembershipPlanVersion[];
}

export interface MembershipPlanPage {
  items: MembershipPlan[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MembershipPlanQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: "active" | "archived";
}

export interface AvailableMembershipCourse {
  id: string;
  title: string;
  slug: string;
  visibility: "PUBLIC" | "PRIVATE";
}

export interface AvailableMembershipCoursePage {
  items: AvailableMembershipCourse[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MembershipDurationInput {
  months: number;
  priceAmountMinor?: string;
  discountPercent?: number;
  displayOrder: number;
}

export interface MembershipVersionInput {
  displayName: string;
  description?: string | null;
  baseMonthlyPriceAmountMinor: string;
  currency: "VND";
  salesStartAt?: string | null;
  salesEndAt?: string | null;
  durations: MembershipDurationInput[];
}

export interface MembershipPlanInput extends MembershipVersionInput {
  code: string;
}

export interface EntitlementDefinitionPage {
  items: ServiceEntitlementDefinition[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });

function queryString(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
}

export const adminMembershipService = {
  listPlans(query: MembershipPlanQuery): Promise<MembershipPlanPage> {
    return client.get(`/admin/membership/plans?${queryString({ page: query.page, pageSize: query.pageSize, search: query.search, status: query.status })}`);
  },
  createPlan(input: MembershipPlanInput): Promise<MembershipPlan> {
    return client.post("/admin/membership/plans", { ...input });
  },
  createVersion(planId: string, input: MembershipVersionInput): Promise<MembershipPlanVersion> {
    return client.post(`/admin/membership/plans/${planId}/versions`, { ...input });
  },
  publishVersion(versionId: string): Promise<MembershipPlanVersion> {
    return client.post(`/admin/membership/versions/${versionId}/publish`);
  },
  archiveVersion(versionId: string): Promise<MembershipPlanVersion> {
    return client.post(`/admin/membership/versions/${versionId}/archive`);
  },
  archivePlan(planId: string): Promise<MembershipPlan> {
    return client.post(`/admin/membership/plans/${planId}/archive`);
  },
  listEntitlementDefinitions(search?: string): Promise<EntitlementDefinitionPage> {
    return client.get(`/admin/membership/service-entitlements?${queryString({ page: 1, pageSize: 100, search })}`);
  },
  listAvailableCourses(search?: string): Promise<AvailableMembershipCoursePage> {
    return client.get(`/admin/membership/available-courses?${queryString({ page: 1, pageSize: 100, search })}`);
  },
  createEntitlementDefinition(input: Omit<ServiceEntitlementDefinition, "id">): Promise<ServiceEntitlementDefinition> {
    return client.post("/admin/membership/service-entitlements", { ...input });
  },
  configureEntitlement(versionId: string, input: { definitionId: string; booleanValue?: boolean; quota?: string }): Promise<MembershipPlanEntitlement> {
    return client.post(`/admin/membership/versions/${versionId}/service-entitlements`, { ...input });
  },
  includeCourse(versionId: string, input: { courseId: string; graceDays: number }): Promise<MembershipIncludedCourse> {
    return client.post(`/admin/membership/versions/${versionId}/included-courses`, { ...input });
  },
};

export function getAdminMembershipErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) return error.message;
  return "Không thể tải dữ liệu hội viên. Vui lòng thử lại.";
}
