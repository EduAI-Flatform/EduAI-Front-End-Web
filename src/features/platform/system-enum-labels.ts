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

function enumLabel(value: string, labels: Record<string, [string, string]>, fallback: [string, string], t: Translate) {
 return t(...(Object.prototype.hasOwnProperty.call(labels, value) ? labels[value] : fallback));
}
export function tmiLedgerKindLabel(kind: string, t: Translate) {
 return enumLabel(kind, {
  earn: ['Tích lũy', 'Earned'], redeem: ['Đổi thưởng', 'Redeemed'], refund: ['Hoàn điểm', 'Refunded'],
  expiry: ['Hết hạn', 'Expired'], adjustment: ['Điều chỉnh', 'Adjustment'],
 }, ['Loại giao dịch khác', 'Other transaction type'], t);
}
export function tmiLedgerSourceLabel(source: string, t: Translate) {
 return enumLabel(source, {
  platform_activity: ['Hoạt động nền tảng', 'Platform activity'], platform_activity_expiry: ['Điểm hoạt động hết hạn', 'Activity point expiry'],
  platform_activity_refund: ['Hoàn điểm hoạt động', 'Activity point refund'], tmi_redemption: ['Đổi thưởng GDS Point', 'GDS Point redemption'],
  tmi_adjustment: ['Điều chỉnh GDS Point', 'GDS Point adjustment'], course_completion: ['Hoàn thành khóa học', 'Course completion'],
  legacy: ['Dữ liệu trước đây', 'Legacy data'], legacy_import: ['Dữ liệu nhập trước đây', 'Legacy import'],
 }, ['Nguồn khác', 'Other source'], t);
}
export function scholarshipStatusLabel(status: string, t: Translate) {
 return enumLabel(status, { draft: ['Nháp', 'Draft'], active: ['Đang mở', 'Active'], paused: ['Tạm dừng', 'Paused'], closed: ['Đã đóng', 'Closed'] }, ['Chưa rõ trạng thái', 'Unknown status'], t);
}
export function scholarshipBenefitLabel(kind: string, t: Translate) {
 return enumLabel(kind, { course_access: ['Quyền truy cập khóa học', 'Course access'], percentage_discount: ['Giảm giá theo phần trăm', 'Percentage discount'], fixed_credit: ['Tín dụng cố định', 'Fixed credit'] }, ['Quyền lợi khác', 'Other benefit'], t);
}
export function scholarshipApplicationStatusLabel(status: string, t: Translate) {
 return enumLabel(status, { pending: ['Chờ duyệt', 'Pending'], awarded: ['Đã cấp', 'Awarded'], rejected: ['Đã từ chối', 'Rejected'], revoked: ['Đã thu hồi', 'Revoked'] }, ['Chưa rõ trạng thái', 'Unknown status'], t);
}
export function jobWorkModeLabel(mode: string, t: Translate) {
 return enumLabel(mode, { remote: ['Từ xa', 'Remote'], hybrid: ['Kết hợp', 'Hybrid'], onsite: ['Tại văn phòng', 'On-site'] }, ['Hình thức làm việc khác', 'Other work arrangement'], t);
}
export function mentorApprovalStatusLabel(status: string = '', t: Translate) {
 return enumLabel(status, { pending: ['Chờ duyệt', 'Pending'], approved: ['Đã duyệt', 'Approved'], rejected: ['Đã từ chối', 'Rejected'] }, ['Chưa rõ trạng thái', 'Unknown status'], t);
}
export function jobStatusLabel(status: string = '', t: Translate) {
 return enumLabel(status, { draft: ['Bản nháp', 'Draft'], published: ['Đã xuất bản', 'Published'], closed: ['Đã đóng', 'Closed'] }, ['Chưa rõ trạng thái', 'Unknown status'], t);
}
export function tmiRewardKindLabel(kind: string, t: Translate) {
 return enumLabel(kind, { course_access: ['Quyền truy cập khóa học', 'Course access'], voucher: ['Mã ưu đãi', 'Voucher'], gift: ['Quà tặng', 'Gift'], digital: ['Quà số', 'Digital gift'], physical: ['Quà tặng', 'Physical gift'] }, ['Phần thưởng khác', 'Other reward'], t);
}
export function tmiRewardStatusLabel(status: string, t: Translate) {
 return enumLabel(status, { draft: ['Nháp', 'Draft'], active: ['Đang bật', 'Active'], disabled: ['Đã tắt', 'Disabled'], expired: ['Đã hết hạn', 'Expired'] }, ['Chưa rõ trạng thái', 'Unknown status'], t);
}
