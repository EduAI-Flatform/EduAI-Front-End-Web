import type { JobApplicationStatus } from '../../services/job.service';
import type { CardEvaluation } from '../../services/membership-cards.service';
type Translate = (vi: string, en: string) => string;
const applicationLabels: Record<JobApplicationStatus, [string, string]> = {
 submitted: ['Đã gửi', 'Submitted'], reviewing: ['Đang xem xét', 'Reviewing'], shortlisted: ['Vào danh sách chọn', 'Shortlisted'],
 accepted: ['Đã chấp nhận', 'Accepted'], rejected: ['Đã từ chối', 'Rejected'], withdrawn: ['Đã rút', 'Withdrawn'],
};
export function applicationStatusLabel(status: JobApplicationStatus, t: Translate) { return t(...applicationLabels[status]); }
export function billingStatusLabel(status: string, t: Translate) {
 const labels: Record<string, [string, string]> = {
 CONFIRMED: ['Đã thanh toán', 'Paid'], PENDING_PAYMENT: ['Chưa thanh toán', 'Unpaid'], CANCELLED: ['Đã hủy', 'Cancelled'], EXPIRED: ['Đã hết hạn', 'Expired'],
 LATE_PAYMENT_REVIEW: ['Thanh toán muộn đang được xem xét', 'Late payment under review'], LATE_PAYMENT_REFUNDED: ['Đã hoàn tiền thanh toán muộn', 'Late payment refunded'],
 };
 return labels[status] ? t(...labels[status]) : t('Chưa rõ trạng thái', 'Unknown status');
}
export function voucherStatusLabel(status: 'draft' | 'active' | 'disabled', t: Translate) {
 const labels: Record<typeof status, [string, string]> = { draft: ['Nháp', 'Draft'], active: ['Đang bật', 'Active'], disabled: ['Đã tắt', 'Disabled'] };
 return t(...labels[status]);
}
export function evaluationStatusLabel(status: CardEvaluation['status'], t: Translate) {
 const labels: Record<typeof status, [string, string]> = { disabled: ['Chưa bật', 'Disabled'], unavailable: ['Chưa thể đánh giá', 'Unavailable'], evaluated: ['Đã đánh giá', 'Evaluated'] };
 return t(...labels[status]);
}
export function evaluationReasonLabel(reason: string, t: Translate) {
 const labels: Record<string, [string, string]> = {
 POLICY_DISABLED: ['Chính sách chưa bật.', 'The policy is disabled.'], POLICY_NOT_VERSIONED: ['Chính sách chưa có phiên bản được xác minh.', 'The policy has no verified revision.'],
 INVALID_POLICY: ['Chính sách chưa hợp lệ.', 'The policy is invalid.'], TOPUP_SOURCE_NOT_LOADED: ['Chưa tải được bằng chứng nạp tiền.', 'Top-up evidence is unavailable.'],
 CANONICAL_TOPUP_MISMATCH: ['Bằng chứng nạp tiền không khớp.', 'Top-up evidence does not match.'], TOPUP_EVIDENCE_REUSED: ['Bằng chứng nạp tiền đã được sử dụng lại.', 'Top-up evidence was reused.'],
 SOURCE_SCAN_LIMIT_EXCEEDED: ['Dữ liệu vượt giới hạn đọc của lượt xem trước.', 'Source data exceeds the preview read limit.'],
 CANONICAL_SETTLEMENT_MISMATCH: ['Bằng chứng thanh toán không khớp.', 'Settlement evidence does not match.'], UNVERIFIED_SETTLEMENT_DISPOSITION: ['Chưa xác minh được loại thanh toán.', 'The settlement disposition is unverified.'],
 INVALID_SETTLEMENT_DATE: ['Ngày thanh toán không hợp lệ.', 'The settlement date is invalid.'], SETTLEMENT_REUSED: ['Bằng chứng thanh toán đã được sử dụng lại.', 'Settlement evidence was reused.'],
 INVALID_REFUND_DATE: ['Ngày hoàn tiền không hợp lệ.', 'The refund date is invalid.'], REFUND_SOURCE_MISMATCH: ['Bằng chứng hoàn tiền không khớp.', 'Refund evidence does not match.'],
 REFUND_EXCEEDS_SETTLED_SPEND: ['Số tiền hoàn vượt số tiền đã thanh toán.', 'Refunds exceed settled spending.'],
 };
 return labels[reason] ? t(...labels[reason]) : t('Chưa thể xác minh dữ liệu đánh giá.', 'Evaluation data could not be verified.');
}
