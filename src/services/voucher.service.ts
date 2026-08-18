import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export type VoucherDecisionReason =
  | "eligible"
  | "code_invalid"
  | "voucher_disabled"
  | "voucher_not_started"
  | "voucher_expired"
  | "invalid_voucher_policy"
  | "invalid_course_price"
  | "currency_mismatch"
  | "minimum_course_price_not_met"
  | "usage_limit_reached"
  | "per_user_limit_reached"
  | "user_not_eligible"
  | "course_scope_not_eligible";

export interface VoucherPreview {
  voucherId: string;
  code: string;
  currency: string;
  eligible: boolean;
  reason: VoucherDecisionReason;
  discountAmountMinor: number;
  finalAmountMinor: number;
}

export type VoucherStatus = "draft" | "active" | "disabled";
export type VoucherKind = "percentage" | "fixed";

export interface Voucher {
  id: string;
  code: string;
  status: VoucherStatus;
  kind: VoucherKind;
  value: number;
  currency: string;
  startsAt: string;
  endsAt: string;
  minimumCoursePriceMinor: number | null;
  maximumDiscountMinor: number | null;
  usageLimit: number | null;
  redeemedCount: number;
  perUserLimit: number | null;
  courseIds: string[];
  categorySlugs: string[];
  eligibleUserIds: string[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherPage {
  items: Voucher[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface VoucherRedemption {
  id: string;
  voucherId: string;
  userId: string;
  courseId: string;
  redemptionKey: string;
  originalAmountMinor: number;
  discountAmountMinor: number;
  finalAmountMinor: number;
  currency: string;
  createdAt: string;
  idempotent: boolean;
}

export interface VoucherRedemptionPage {
  items: VoucherRedemption[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface VoucherMutationInput {
  code: string;
  kind: VoucherKind;
  value: number;
  currency: string;
  startsAt: string;
  endsAt: string;
  minimumCoursePriceMinor?: number | null;
  maximumDiscountMinor?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  courseIds?: string[];
  categorySlugs?: string[];
  eligibleUserIds?: string[];
  status?: VoucherStatus;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const voucherService = {
  preview(courseId: string, code: string): Promise<VoucherPreview> {
    return authenticatedApiClient.post<VoucherPreview>(
      `/courses/${courseId}/voucher-preview`,
      { code },
    );
  },
};

export const adminVoucherService = {
  list(page = 1, pageSize = 20): Promise<VoucherPage> {
    return authenticatedApiClient.get<VoucherPage>(
      `/admin/vouchers?page=${page}&pageSize=${pageSize}`,
    );
  },

  get(id: string): Promise<Voucher> {
    return authenticatedApiClient.get<Voucher>(`/admin/vouchers/${id}`);
  },

  create(input: VoucherMutationInput): Promise<Voucher> {
    return authenticatedApiClient.post<Voucher>("/admin/vouchers", { ...input });
  },

  update(id: string, input: Partial<VoucherMutationInput>): Promise<Voucher> {
    return authenticatedApiClient.patch<Voucher>(`/admin/vouchers/${id}`, { ...input });
  },

  redemptions(id: string, page = 1, pageSize = 20): Promise<VoucherRedemptionPage> {
    return authenticatedApiClient.get<VoucherRedemptionPage>(
      `/admin/vouchers/${id}/redemptions?page=${page}&pageSize=${pageSize}`,
    );
  },
};

export function getVoucherErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const messages: Record<string, string> = {
      CODE_INVALID: "Mã voucher không hợp lệ.",
      VOUCHER_DISABLED: "Mã voucher đã được tắt.",
      VOUCHER_EXPIRED: "Mã voucher đã hết hạn.",
      VOUCHER_NOT_STARTED: "Mã voucher chưa bắt đầu áp dụng.",
      MINIMUM_COURSE_PRICE_NOT_MET: "Khóa học chưa đạt mức giá tối thiểu của voucher.",
      USAGE_LIMIT_REACHED: "Voucher đã hết lượt sử dụng.",
      PER_USER_LIMIT_REACHED: "Bạn đã sử dụng hết lượt của voucher này.",
      USER_NOT_ELIGIBLE: "Tài khoản của bạn không thuộc nhóm áp dụng voucher.",
      COURSE_SCOPE_NOT_ELIGIBLE: "Voucher không áp dụng cho khóa học này.",
      CURRENCY_MISMATCH: "Voucher không áp dụng cho loại tiền của khóa học.",
    };
    return messages[error.code] ?? error.message;
  }

  return "Không thể kiểm tra voucher. Vui lòng thử lại.";
}

export function getVoucherReasonMessage(reason: VoucherDecisionReason): string {
  const messages: Record<VoucherDecisionReason, string> = {
    eligible: "Voucher hợp lệ.",
    code_invalid: "Mã voucher không hợp lệ.",
    voucher_disabled: "Mã voucher đã được tắt.",
    voucher_not_started: "Mã voucher chưa bắt đầu áp dụng.",
    voucher_expired: "Mã voucher đã hết hạn.",
    invalid_voucher_policy: "Chính sách voucher không hợp lệ.",
    invalid_course_price: "Khóa học chưa có giá hợp lệ.",
    currency_mismatch: "Voucher không áp dụng cho loại tiền của khóa học.",
    minimum_course_price_not_met: "Khóa học chưa đạt mức giá tối thiểu của voucher.",
    usage_limit_reached: "Voucher đã hết lượt sử dụng.",
    per_user_limit_reached: "Bạn đã sử dụng hết lượt của voucher này.",
    user_not_eligible: "Tài khoản của bạn không thuộc nhóm áp dụng voucher.",
    course_scope_not_eligible: "Voucher không áp dụng cho khóa học này.",
  };
  return messages[reason];
}
