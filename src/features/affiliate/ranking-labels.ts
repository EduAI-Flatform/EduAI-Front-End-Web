export function rankingReasonText(reason: string | null | undefined, t: (vi: string, en: string) => string): string {
  const messages: Record<string, [string, string]> = {
    RANKING_POLICY_NOT_CONFIGURED: ['Chưa cấu hình đầy đủ chính sách xếp hạng.', 'Ranking policy is not fully configured.'],
    RANKING_DISABLED: ['Báo cáo xếp hạng đang tắt.', 'Ranking reporting is disabled.'],
    RANKING_POLICY_INVALID: ['Cấu hình xếp hạng không hợp lệ. Chọn rõ cơ sở, kỳ và quy tắc đồng hạng.', 'Invalid ranking configuration. Explicitly select basis, period and tie policy.'],
    RANKING_NOT_PARTICIPATING: ['Tài khoản chưa thuộc nhóm đủ điều kiện xếp hạng.', 'This account is not in the eligible ranking population.'],
    RANKING_POPULATION_SCAN_LIMIT_EXCEEDED: ['Số người tham gia vượt giới hạn kiểm tra; chưa thể tính hạng đầy đủ.', 'Participant population exceeds the scan limit; complete ranking is unavailable.'],
    RANKING_SOURCE_SCAN_LIMIT_EXCEEDED: ['Nguồn ghi nhận vượt giới hạn kiểm tra; chưa thể tính hạng đầy đủ.', 'Recorded sources exceed the scan limit; complete ranking is unavailable.'],
    RANKING_SOURCE_INVALID: ['Dữ liệu nguồn xếp hạng không hợp lệ.', 'Ranking source data is invalid.'],
    RANKING_SOURCE_UNAVAILABLE: ['Nguồn dữ liệu xếp hạng chưa khả dụng.', 'Ranking source data is unavailable.'],
  };
  return Object.prototype.hasOwnProperty.call(messages, reason ?? '') ? t(...messages[reason!]) : t('Không đủ dữ liệu đầy đủ và hợp lệ để xác định hạng.', 'Complete valid data is unavailable to determine a rank.');
}
