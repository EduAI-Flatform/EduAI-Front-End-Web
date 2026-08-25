import { ApiClient, ApiClientError } from './api-client';
import { getAuthSession } from './auth.service';

export interface MembershipCatalogItem {
  id: string;
  plan: { id: string; code: string };
  displayName: string;
  description: string | null;
  currency: 'VND';
  durations: Array<{ id: string; months: number; basePriceAmountMinor: string; discountPercent: number | null; finalPriceAmountMinor: string }>;
  services: Array<{ code: string; displayName: string; valueType: string; booleanValue: boolean | null; quota: string | null; unitLabel: string | null }>;
  includedCourses: Array<{ id: string; title: string; slug: string; graceDays: number }>;
  removedCourses: MembershipRemovedCourse[];
}

export interface MembershipRemovedCourse {
  id: string;
  title: string;
  slug: string;
  startedBeforeRemoval: boolean;
  graceDays: number;
  graceStartsAt: string | null;
  graceEndsAt: string | null;
}

export interface MembershipCheckout {
  order: { id: string; orderNumber: string; status: string; payable: { amountMinor: string; currency: 'VND' } };
  action: 'PURCHASE' | 'RENEW' | 'UPGRADE' | 'DOWNGRADE';
  plan: { id: string; code: string; versionId: string; displayName: string };
  durationMonths: number;
  startsAt: string;
  endsAt: string;
  activatesImmediately: boolean;
  removedCourses: MembershipRemovedCourse[];
  paymentRequired: boolean;
}

export interface MembershipCurrentState {
  membership: {
    id: string;
    plan: { id: string; code: string };
    versionId: string;
    displayName: string;
    startsAt: string;
    expiresAt: string;
    status: 'ACTIVE' | 'EXPIRED';
  } | null;
  pendingChange: {
    action: 'UPGRADE' | 'DOWNGRADE';
    startsAt: string;
    endsAt: string;
    activatesImmediately: boolean;
    plan: { id: string; code: string; versionId: string; displayName: string };
    order: { id: string; orderNumber: string; status: 'PENDING_PAYMENT' };
  } | null;
  expiringGraceCourses: Array<{ courseId: string; title: string; slug: string; graceEndsAt: string }>;
}

const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });

export const membershipService = {
  catalog: () => client.get<{ items: MembershipCatalogItem[] }>('/membership/catalog'),
  current: () => client.get<MembershipCurrentState>('/membership/current'),
  checkout: (input: { versionId: string; durationOptionId: string; requestedChange?: 'UPGRADE' | 'DOWNGRADE'; changedBenefitsConfirmed: true }) =>
    client.post<MembershipCheckout>('/membership/checkout', input, { headers: { 'Idempotency-Key': globalThis.crypto?.randomUUID?.() ?? `membership-${Date.now()}` } }),
};

export function getMembershipErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.code === 'BENEFITS_CONFIRMATION_REQUIRED') return 'Bạn cần xác nhận thay đổi quyền lợi trước khi thanh toán.';
    if (error.code === 'CHANGE_KIND_REQUIRED') return 'Hãy chọn nâng cấp hoặc hạ cấp trước khi tiếp tục.';
    if (error.code === 'MEMBERSHIP_VERSION_SUPERSEDED') return 'Gói đã có phiên bản mới. Hãy tải lại để xem đúng quyền lợi trước khi tiếp tục.';
  }
  return error instanceof Error ? error.message : 'Không thể tải thông tin gói thành viên.';
}
