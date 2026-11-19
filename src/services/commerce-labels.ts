type Translate = (vi: string, en: string) => string;
// Presentation only. Canonical values still drive filters, actions and API payloads.
const labels: Record<string, readonly [string, string]> = {
  COURSE: ['Khóa học', 'Course'], MEMBERSHIP: ['Gói thành viên cũ', 'Legacy membership'],
  DRAFT: ['Bản nháp', 'Draft'], ACTIVE: ['Đang hoạt động', 'Active'], ARCHIVED: ['Đã lưu trữ', 'Archived'],
  PUBLISHED: ['Đã xuất bản', 'Published'], PUBLIC: ['Công khai', 'Public'], PRIVATE: ['Riêng tư', 'Private'], UNLISTED: ['Không niêm yết', 'Unlisted'], CLEAR: ['Không có cảnh báo', 'Clear'], HIDDEN: ['Đã ẩn', 'Hidden'], FLAGGED: ['Đã gắn cờ', 'Flagged'], BLOCKED: ['Đã chặn', 'Blocked'],
  PENDING_PAYMENT: ['Chờ thanh toán', 'Pending payment'], CONFIRMED: ['Đã xác nhận', 'Confirmed'], CANCELLED: ['Đã hủy', 'Cancelled'], EXPIRED: ['Đã hết hạn', 'Expired'],
  LATE_PAYMENT_REVIEW: ['Đang kiểm tra thanh toán trễ', 'Late payment review'], LATE_PAYMENT_REFUNDED: ['Đã hoàn thanh toán trễ', 'Late payment refunded'],
  NOT_STARTED: ['Chưa bắt đầu', 'Not started'], PROCESSING: ['Đang xử lý', 'Processing'], FULFILLED: ['Đã cấp quyền', 'Fulfilled'], FAILED: ['Thất bại', 'Failed'],
  CREATED: ['Đã tạo', 'Created'], PENDING: ['Đang chờ', 'Pending'], PAID: ['Đã thanh toán', 'Paid'], LATE_PAID: ['Đã thanh toán trễ', 'Late paid'],
  PROVIDER_COLLECTION: ['Thu qua nhà cung cấp', 'Provider collection'], NO_PAYMENT_REQUIRED: ['Không cần thanh toán', 'No payment required'], WALLET_CAPTURE: ['Thanh toán từ ví', 'Wallet capture'],
  MATCHED: ['Đã khớp', 'Matched'], DUPLICATE_COLLECTION: ['Khoản thu trùng', 'Duplicate collection'], LATE_COLLECTION: ['Khoản thu trễ', 'Late collection'], INTERNAL: ['Nội bộ', 'Internal'],
  LATE_PAYMENT: ['Thanh toán trễ', 'Late payment'], PROVIDER_OUTAGE: ['Nhà cung cấp gián đoạn', 'Provider outage'], PROVIDER_FACT_MISMATCH: ['Thông tin nhà cung cấp không khớp', 'Provider fact mismatch'], UNKNOWN_PROVIDER_STATUS: ['Chưa rõ trạng thái nhà cung cấp', 'Unknown provider status'], PAID_NOT_FULFILLED: ['Đã thanh toán, chưa cấp quyền', 'Paid, not fulfilled'],
  OPEN: ['Đang mở', 'Open'], RESOLVED: ['Đã xử lý', 'Resolved'], REQUESTED: ['Đã yêu cầu', 'Requested'], RECORDED: ['Đã ghi nhận', 'Recorded'], REJECTED: ['Đã từ chối', 'Rejected'],
  RESERVED: ['Đã giữ', 'Reserved'], CONSUMED: ['Đã sử dụng', 'Consumed'], RELEASED: ['Đã giải phóng', 'Released'],
};
export function commerceStateLabel(value: string, t: Translate): string {
  const pair = labels[value.toUpperCase()];
  return pair ? t(...pair) : value;
}

const historicalActions: Record<string, readonly [string, string]> = {
  PURCHASE: ['Mua gói mới', 'New plan purchase'], RENEW: ['Gia hạn gói thành viên', 'Membership renewal'],
  UPGRADE: ['Nâng cấp gói', 'Plan upgrade'], DOWNGRADE: ['Hạ cấp gói', 'Plan downgrade'],
};
export function historicalMembershipActionLabel(action: string, t: Translate): string {
  const pair = Object.prototype.hasOwnProperty.call(historicalActions, action) ? historicalActions[action] : undefined;
  return pair ? t(...pair) : t('Gói thành viên', 'Membership plan');
}
