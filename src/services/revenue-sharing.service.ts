import { ApiClient } from "./api-client";
import { getAuthSession } from "./auth.service";

export type NoticeMode = "immediate" | "delayed";
export type ActivationInput = { noticeMode: "immediate" } | { noticeMode: "delayed"; noticeDays: number };
export interface RevenueTerms { id: string; title: string; body: string; createdAt?: string }
export interface RevenueRule { priority: number; categorySlugs?: string[]; levels?: ("beginner" | "intermediate" | "advanced")[]; minPriceAmountMinor?: string; maxPriceAmountMinor?: string; weight: number }
export interface PlanPolicyInput { planId: string; sourceVersionId: string; termsId: string; platformFeeBps: number; rules: RevenueRule[]; overrides: { courseId: string; weight: number }[]; noticeMode: NoticeMode; noticeDays?: number }
export interface RevenuePolicy { id: string; status: string; platformFeeBps: number; effectiveAt: string; planId?: string; sourceVersionId?: string; termsId?: string }
export interface RevenuePlanSummary { id: string; code: string; status: string; versions: { id: string; displayName: string; status: "draft" | "published" | "archived"; versionNumber: number }[] }
export interface RevenueState { retailPolicies: RevenuePolicy[]; terms: RevenueTerms[]; planPolicies: RevenuePolicy[]; plans: RevenuePlanSummary[] }
export interface PolicyPreview { courses: { courseId: string; title: string; sellerId: string; weight: number; shareBps: number; previousShareBps: number }[]; totalWeight: number; previousTotalWeight: number; affectedSellerCount: number; removedCourses: { courseId: string; title: string; sellerId: string; previousShareBps: number }[] }
export interface RevenueCourse { id: string; title: string; participationStatus?: string | null }
export interface CoursePreview { course: { id: string; title: string }; participation: { status: string; termsId: string } | null; terms: RevenueTerms[]; plans: { planId: string; displayName: string; policyId: string; weight: number; totalWeight: number; shareBps: number; platformFeeBps: number; effectiveAt: string; status: string; isIncluded: boolean; isMatching: boolean }[] }
export interface RevenueReportItem { id: string; orderLineId: string; orderId: string; sellerId: string; courseId: string | null; amountMinor: string; dueAt: string; recognizedAmountMinor: string; refundAdjustmentAmountMinor: string; pendingAmountMinor: string }
export interface RevenueReport { items: RevenueReportItem[]; totals: { pendingAmountMinor: string; recognizedAmountMinor: string; refundAdjustmentAmountMinor: string }; page: number; pageSize: number; total: number; totalPages: number }
export interface RevenueCoursePage { items: RevenueCourse[]; page: number; pageSize: number; total: number; totalPages: number }

export function activationInput(mode: NoticeMode, days: string): ActivationInput {
  if (mode === "immediate") return { noticeMode: "immediate" };
  if (!/^[1-9]\d*$/.test(days) || !Number.isSafeInteger(Number(days)) || Number(days) > 3650) throw new Error("Số ngày báo trước phải là số nguyên dương.");
  return { noticeMode: "delayed", noticeDays: Number(days) };
}
export function percentToBasisPoints(value: string): number {
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(value)) throw new Error("Tỷ lệ phải từ 0 đến 100%, tối đa hai chữ số thập phân.");
  const [whole, fraction = ""] = value.split(".");
  const basisPoints = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (basisPoints > 10000) throw new Error("Tỷ lệ không được vượt quá 100%.");
  return basisPoints;
}
export function revenueError(error: unknown): string { return error instanceof Error ? error.message : "Không thể xử lý yêu cầu. Vui lòng thử lại."; }
export function formatRevenueMoney(value: string): string { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(BigInt(value)); }
export function formatRevenueDate(value: string): string { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)); }
const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });
const resource = (id: string) => encodeURIComponent(id);
export const revenueSharingService = {
  state: (): Promise<RevenueState> => client.get("/admin/revenue-sharing/state"),
  retailPolicy: (input: { platformFeeBps: number } & ActivationInput): Promise<RevenuePolicy> => client.post("/admin/revenue-sharing/retail-policies", { ...input }),
  createTerms: (input: { title: string; body: string }): Promise<RevenueTerms> => client.post("/admin/revenue-sharing/terms", input),
  previewPolicy: (input: PlanPolicyInput): Promise<PolicyPreview> => client.post("/admin/revenue-sharing/plan-policies/preview", { ...input }),
  schedulePolicy: (input: PlanPolicyInput): Promise<RevenuePolicy> => client.post("/admin/revenue-sharing/plan-policies", { ...input }),
  cancelPolicy: (id: string): Promise<RevenuePolicy> => client.post(`/admin/revenue-sharing/policies/${resource(id)}/cancel`),
  courses: (page = 1, pageSize = 25): Promise<RevenueCoursePage> => client.get(`/seller/revenue-sharing/courses?page=${page}&pageSize=${pageSize}`),
  previewCourse: (id: string): Promise<CoursePreview> => client.get(`/seller/revenue-sharing/courses/${resource(id)}/preview`),
  accept: (courseId: string, termsId: string): Promise<unknown> => client.post(`/seller/revenue-sharing/courses/${resource(courseId)}/participation`, { termsId }),
  leave: (courseId: string): Promise<unknown> => client.delete(`/seller/revenue-sharing/courses/${resource(courseId)}/participation`),
  report: (role: "admin" | "seller", page = 1, pageSize = 25): Promise<RevenueReport> => client.get(`/${role}/revenue-sharing/report?page=${page}&pageSize=${pageSize}`),
};