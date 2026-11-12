import { translateSystemMessage, currentSystemLocale } from "../features/platform/translate-system-message";
import { ApiClient, ApiClientError } from './api-client';
import { getAuthSession } from './auth.service';

export const WITHDRAWAL_STATUSES = ['PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'CANCELLED', 'REJECTED', 'FAILED'] as const;
export type WithdrawalStatus = typeof WITHDRAWAL_STATUSES[number];
export type WithdrawalAction = 'approve' | 'reject' | 'process' | 'pay' | 'fail';
export interface WithdrawalSettings { minimumMinor: string; maximumMinor: string; version: number; admissionEnabled: boolean; processingEnabled: boolean; accountVerificationRequired?: boolean; accountVerificationAvailable?: boolean }
export interface WithdrawalInput { amountMinor: string; bankCode: string; accountNumber: string; accountHolder: string; verificationId?: string }
export interface GdsBank { code: string; bin: string; shortName: string; name: string; logoUrl: string; verificationSupported: boolean; verificationUnavailableReason?: string }
export interface GdsBanks { banks: GdsBank[]; stale: boolean; verificationRequired: boolean; verificationAvailable: boolean }
export interface AccountVerification { verificationId: string; bankCode: string; accountNumber: string; accountHolder: string; verifiedAt: string; expiresAt: string }
export interface RecipientCheck { method: 'MANUAL' | 'PROVIDER'; actorId: string; verifiedAt: string; expiresAt: string }
export interface WithdrawalQr { withdrawalId: string; bankCode: string; bankBin: string; bankName: string; accountNumber: string; accountHolder: string; amountMinor: string; currency: 'VND'; transferContent: string; qrCodeDataUrl: string; verificationMethod?: 'MANUAL' | 'PROVIDER'; verifiedAt: string; expiresAt: string }
export interface WithdrawalEvent { id: string; fromStatus: string | null; toStatus: string; actorId: string; reason: string; createdAt: string }
export interface Withdrawal extends WithdrawalInput { id: string; ownerId?: string; currency: 'VND'; status: WithdrawalStatus; createdAt: string; updatedAt?: string; processingAdminId: string | null; bankTransactionRef: string | null; transferredAt: string | null; events?: WithdrawalEvent[]; bankName?: string; bankShortName?: string; bankBin?: string; bankLogoUrl?: string; accountVerifiedAt?: string; accountVerificationStatus?: string; recipientCheck?: RecipientCheck | null }
export interface WithdrawalPage { items: Withdrawal[]; total: number; page: number; pageSize: number; totalPages: number }
export interface RevenueReview { id: string; periodId: string; walletId: string; ownerId: string; recognizedMinor: string; netMinor: string; historicalPaidMinor: string; reviewRequired: boolean }
export interface RevenueReviewPage { items: RevenueReview[]; total: number; page: number; pageSize: number; totalPages: number }
const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });
const base = '/wallet/gds';
const admin = '/admin/wallet/gds';
export const gdsWithdrawalService = {
  banks: () => client.get<GdsBanks>(`${base}/banks`),
  adminBanks: () => client.get<GdsBanks>(`${admin}/banks`),
  verifyAccount: (input: { bankCode: string; accountNumber: string }) => client.post<AccountVerification>(`${base}/account-verifications`, input),
  adminVerifyAccount: (id: string) => client.post<AccountVerification>(`${admin}/withdrawals/${encodeURIComponent(id)}/verify-account`, {}),
  qr: (id: string) => client.get<WithdrawalQr>(`${admin}/withdrawals/${encodeURIComponent(id)}/qr`),
  settings: () => client.get<WithdrawalSettings>(`${base}/withdrawal-settings`),
  list: (page = 1) => client.get<WithdrawalPage>(`${base}/withdrawals?page=${page}&pageSize=20`),
  detail: (id: string) => client.get<Withdrawal>(`${base}/withdrawals/${encodeURIComponent(id)}`),
  create: (input: WithdrawalInput, key: string) => client.post<Withdrawal>(`${base}/withdrawals`, { ...input }, { headers: { 'Idempotency-Key': key } }),
  cancel: (id: string, reason: string) => client.post<Withdrawal>(`${base}/withdrawals/${encodeURIComponent(id)}/cancel`, { reason }),
  adminSettings: () => client.get<WithdrawalSettings>(`${admin}/withdrawal-settings`),
  updateSettings: (input: WithdrawalSettings) => client.patch<WithdrawalSettings>(`${admin}/withdrawal-settings`, {
    minimumMinor: input.minimumMinor, maximumMinor: input.maximumMinor, version: input.version,
    admissionEnabled: input.admissionEnabled, processingEnabled: input.processingEnabled,
    ...(input.accountVerificationRequired === undefined ? {} : { accountVerificationRequired: input.accountVerificationRequired }),
  }),
  adminList: (page = 1, status = '') => client.get<WithdrawalPage>(`${admin}/withdrawals?page=${page}&pageSize=20${status ? `&status=${encodeURIComponent(status)}` : ''}`),
  adminDetail: (id: string) => client.get<Withdrawal>(`${admin}/withdrawals/${encodeURIComponent(id)}`),
  confirmRecipient: (id: string, input: { confirmed: boolean }) => client.post<Withdrawal>(`${admin}/withdrawals/${encodeURIComponent(id)}/confirm-recipient`, input),
  action: (id: string, action: WithdrawalAction, input: { reason?: string; bankTransactionRef?: string; transferredAt?: string }) => client.post<Withdrawal>(`${admin}/withdrawals/${encodeURIComponent(id)}/${action}`, input),
  revenueReviews: (page = 1) => client.get<RevenueReviewPage>(`${admin}/revenue-reviews?page=${page}&pageSize=20`),
  approveRevenueReview: (id: string, paidMinor: string, reason: string) => client.post<RevenueReview>(`${admin}/revenue-reviews/${encodeURIComponent(id)}/approve`, { paidMinor, reason }),
};
export const withdrawalLabels: Record<WithdrawalStatus, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Chờ chuyển khoản', PROCESSING: 'Chờ chuyển khoản', PAID: 'Đã chuyển khoản', CANCELLED: 'Đã hủy', REJECTED: 'Từ chối', FAILED: 'Chuyển khoản thất bại' };
export const withdrawalActionLabels: Record<WithdrawalAction, string> = { approve: 'Duyệt yêu cầu', reject: 'Từ chối yêu cầu', process: 'Nhận chuyển khoản', pay: 'Đã chuyển khoản', fail: 'Xác nhận chưa chi / thất bại' };
export const withdrawalFilterOptions = [{ value: '', label: 'Tất cả' }, { value: 'PENDING', label: 'Chờ duyệt' }, { value: 'AWAITING_TRANSFER', label: 'Chờ chuyển khoản' }, { value: 'PAID', label: 'Đã chuyển khoản' }, { value: 'CANCELLED', label: 'Đã hủy' }, { value: 'REJECTED', label: 'Từ chối' }, { value: 'FAILED', label: 'Chuyển khoản thất bại' }];
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
    const detail = `${error.code} ${error.message}`;
    if (detail.includes('GDS_ACCOUNT_HOLDER_MISMATCH')) return translateSystemMessage("Tên trên ứng dụng ngân hàng không khớp tên trong yêu cầu. Không chuyển tiền; hãy từ chối và nêu rõ lý do.");
    if (detail.includes('GDS_ACCOUNT_VERIFICATION_UNAVAILABLE') || error.status === 503) return translateSystemMessage("Dịch vụ tra tên tự động chưa sẵn sàng. Đây không phải kết luận tài khoản hoặc tên người nhận bị sai.");
    if (detail.includes('GDS_ACCOUNT_VERIFICATION_REQUIRED')) return translateSystemMessage("Cần đối chiếu lại người nhận cho admin đang xử lý trước khi mở QR. Yêu cầu và tiền đang giữ được giữ nguyên.");
    if (detail.includes('GDS_MANUAL_CHECK_NOT_ALLOWED')) return translateSystemMessage("Yêu cầu này cần tra cứu tự động; không thể thay bằng xác nhận thủ công.");
    if (error.status === 409) return translateSystemMessage("Dữ liệu đã thay đổi hoặc yêu cầu chưa đủ điều kiện. Hãy tải lại trước khi tiếp tục.");
    if (error.status === 403) return translateSystemMessage("Thao tác chưa được mở hoặc tài khoản không có quyền xử lý.");
    if (error.status === 400) return translateSystemMessage("Kiểm tra số tiền, thông tin ngân hàng và lý do xử lý.");
  }
  return translateSystemMessage("Chưa xác định được kết quả. Hãy tải lại lịch sử hoặc thử lại cùng yêu cầu; không chuyển khoản thêm.");
}
export function withdrawalDate(value: string | null): string {
  return value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(currentSystemLocale(), { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—';
}
