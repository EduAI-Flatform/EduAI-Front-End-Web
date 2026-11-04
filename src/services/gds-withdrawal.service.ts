import { ApiClient, ApiClientError } from './api-client';
import { getAuthSession } from './auth.service';

export const WITHDRAWAL_STATUSES = ['PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'CANCELLED', 'REJECTED', 'FAILED'] as const;
export type WithdrawalStatus = typeof WITHDRAWAL_STATUSES[number];
export type WithdrawalAction = 'approve' | 'reject' | 'process' | 'pay' | 'fail';
export interface WithdrawalSettings { minimumMinor: string; maximumMinor: string; version: number; admissionEnabled: boolean; processingEnabled: boolean }
export interface WithdrawalInput { amountMinor: string; bankCode: string; accountNumber: string; accountHolder: string }
export interface WithdrawalEvent { id: string; fromStatus: string | null; toStatus: string; actorId: string; reason: string; createdAt: string }
export interface Withdrawal extends WithdrawalInput { id: string; ownerId?: string; currency: 'VND'; status: WithdrawalStatus; createdAt: string; updatedAt: string; processingAdminId: string | null; bankTransactionRef: string | null; transferredAt: string | null; events?: WithdrawalEvent[] }
export interface WithdrawalPage { items: Withdrawal[]; total: number; page: number; pageSize: number; totalPages: number }
export interface RevenueReview { id: string; periodId: string; walletId: string; ownerId: string; recognizedMinor: string; netMinor: string; historicalPaidMinor: string; reviewRequired: boolean }
export interface RevenueReviewPage { items: RevenueReview[]; total: number; page: number; pageSize: number; totalPages: number }
const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });
const base = '/wallet/gds';
const admin = '/admin/wallet/gds';
export const gdsWithdrawalService = {
  settings: () => client.get<WithdrawalSettings>(`${base}/withdrawal-settings`),
  list: (page = 1) => client.get<WithdrawalPage>(`${base}/withdrawals?page=${page}&pageSize=20`),
  detail: (id: string) => client.get<Withdrawal>(`${base}/withdrawals/${encodeURIComponent(id)}`),
  create: (input: WithdrawalInput, key: string) => client.post<Withdrawal>(`${base}/withdrawals`, { ...input }, { headers: { 'Idempotency-Key': key } }),
  cancel: (id: string, reason: string) => client.post<Withdrawal>(`${base}/withdrawals/${encodeURIComponent(id)}/cancel`, { reason }),
  adminSettings: () => client.get<WithdrawalSettings>(`${admin}/withdrawal-settings`),
  updateSettings: (input: WithdrawalSettings) => client.patch<WithdrawalSettings>(`${admin}/withdrawal-settings`, { ...input }),
  adminList: (page = 1, status = '') => client.get<WithdrawalPage>(`${admin}/withdrawals?page=${page}&pageSize=20${status ? `&status=${encodeURIComponent(status)}` : ''}`),
  adminDetail: (id: string) => client.get<Withdrawal>(`${admin}/withdrawals/${encodeURIComponent(id)}`),
  action: (id: string, action: WithdrawalAction, input: { reason: string; bankTransactionRef?: string; transferredAt?: string }) => client.post<Withdrawal>(`${admin}/withdrawals/${encodeURIComponent(id)}/${action}`, input),
  revenueReviews: (page = 1) => client.get<RevenueReviewPage>(`${admin}/revenue-reviews?page=${page}&pageSize=20`),
  approveRevenueReview: (id: string, paidMinor: string, reason: string) => client.post<RevenueReview>(`${admin}/revenue-reviews/${encodeURIComponent(id)}/approve`, { paidMinor, reason }),
};
export const withdrawalLabels: Record<WithdrawalStatus, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', PROCESSING: 'Đang chuyển khoản', PAID: 'Đã chi', CANCELLED: 'Đã hủy', REJECTED: 'Từ chối', FAILED: 'Chuyển khoản thất bại' };
export const withdrawalActionLabels: Record<WithdrawalAction, string> = { approve: 'Duyệt yêu cầu', reject: 'Từ chối yêu cầu', process: 'Nhận chuyển khoản', pay: 'Xác nhận đã chi', fail: 'Xác nhận chưa chi / thất bại' };
export function withdrawalActions(status: WithdrawalStatus): WithdrawalAction[] {
  return status === 'PENDING' ? ['approve', 'reject'] : status === 'APPROVED' ? ['process', 'reject'] : status === 'PROCESSING' ? ['pay', 'fail'] : [];
}
export function isHistoricalPaidValid(paidMinor: string, recognizedMinor: string | undefined): boolean {
  return /^(0|[1-9]\d{0,18})$/.test(paidMinor) && typeof recognizedMinor === 'string' &&
    /^(0|[1-9]\d{0,18})$/.test(recognizedMinor) && BigInt(paidMinor) <= BigInt(recognizedMinor);
}
export function canSubmitWithdrawal(amount: string, available: string, debt: string, settings: WithdrawalSettings | null): boolean {
  if (!settings?.admissionEnabled || !/^[1-9]\d{0,18}$/.test(amount) || !/^(0|[1-9]\d{0,18})$/.test(available) || debt !== '0') return false;
  if (!/^[1-9]\d{0,18}$/.test(settings.minimumMinor) || !/^[1-9]\d{0,18}$/.test(settings.maximumMinor)) return false;
  const value = BigInt(amount);
  return value >= BigInt(settings.minimumMinor) && value <= BigInt(settings.maximumMinor) && value <= BigInt(available);
}
export function withdrawalError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 409) return 'Dữ liệu đã thay đổi hoặc yêu cầu chưa đủ điều kiện. Hãy tải lại trước khi tiếp tục.';
    if (error.status === 403) return 'Thao tác chưa được mở hoặc tài khoản không có quyền xử lý.';
    if (error.status === 400) return 'Kiểm tra số tiền, thông tin ngân hàng và lý do xử lý.';
  }
  return 'Chưa xác định được kết quả. Hãy tải lại lịch sử hoặc thử lại cùng yêu cầu; không chuyển khoản thêm.';
}
export function withdrawalDate(value: string | null): string {
  return value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—';
}
