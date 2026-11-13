type Translate = (vi: string, en: string) => string;
export function quotaAmount(value: string, locale: string): string {
  return /^(0|[1-9][0-9]*)$/.test(value) ? new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(BigInt(value)) : '—';
}
export function quotaServiceName(code: string, t: Translate): string {
  const names: Record<string, [string, string]> = { AI_CHAT: ['Trò chuyện AI', 'AI chat'], AI_SUMMARY: ['Tóm tắt AI', 'AI summary'],
    AI_QUIZ: ['Tạo quiz AI', 'AI quiz generation'], AI_FLASHCARDS: ['Tạo thẻ ghi nhớ AI', 'AI flashcards'], AI_LEARNING_PATH: ['Lộ trình AI', 'AI learning path'] };
  return names[code] ? t(...names[code]) : code;
}
export function quotaPeriodName(period: string, t: Translate): string {
  return period.toLowerCase() === 'calendar_month' ? t('Tháng dương lịch (UTC)', 'Calendar month (UTC)')
    : period.toLowerCase() === 'membership_term' ? t('Chu kỳ cố định', 'Fixed term')
    : period.toLowerCase() === 'none' ? t('Không đặt lại', 'Does not reset') : t('Chưa có thông tin chu kỳ', 'Period is unavailable');
}
export function quotaIssueText(reason: string, t: Translate): string | undefined {
  const messages: Record<string, [string, string]> = {
    CARD_SERVICE_LIMIT_RUNTIME_NOT_IMPLEMENTED: ['Tính năng hạn mức chưa mở áp dụng.', 'Service quota activation is not available yet.'],
    CARD_SERVICE_SCHEMA_NOT_VERIFIED: ['Hạ tầng hạn mức chưa được xác minh.', 'Service quota infrastructure is not verified.'],
    CARD_SERVICE_DEFINITION_NOT_FOUND: ['Không tìm thấy định nghĩa dịch vụ. Chọn lại từ danh mục.', 'Service definition not found. Select it again from the catalog.'],
    CARD_SERVICE_OPERATION_NOT_BOUND: ['Dịch vụ chưa được kết nối với thao tác thực tế.', 'The service is not bound to an executable operation.'],
    CARD_SERVICE_REQUIRES_REQUEST_QUOTA: ['Dịch vụ phải hỗ trợ quota tính theo lượt yêu cầu.', 'The service must support metered request quotas.'],
    CARD_SERVICE_TERM_NOT_CONFIGURED: ['Cần khai báo mốc và thời lượng chu kỳ hạn mức.', 'Configure the quota term anchor and duration.'],
    SERVICE_TERM_NOT_CONFIGURED: ['Cần khai báo mốc và thời lượng chu kỳ hạn mức.', 'Configure the quota term anchor and duration.'],
    SERVICE_TERM_NOT_STARTED: ['Chu kỳ hạn mức chưa bắt đầu tại thời điểm xem trước.', 'The quota term has not started at the preview time.'],
    CARD_SERVICE_USAGE_SCAN_LIMIT_EXCEEDED: ['Lịch sử vượt giới hạn đọc của lượt xem trước. Chưa thể mô phỏng đầy đủ.', 'Usage history exceeds the preview read limit. A complete projection is unavailable.'],
  };
  return messages[reason] ? t(...messages[reason]) : undefined;
}
