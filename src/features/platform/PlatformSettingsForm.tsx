import { useId } from "react";
import { usePlatform } from "./PlatformProvider";

const names: Record<string, [string, string]> = {
  fundingSource: ['Nguồn chi hoa hồng', 'Commission funding source'],
  allocationPrecedence: ['Thứ tự phân bổ', 'Allocation precedence'],
  currency: ["Tiền tệ", "Currency"],
  cycleMode: ["Cách tính chu kỳ", "Cycle mode"],
  commissionBase: ["Cơ sở tính hoa hồng", "Commission base"],
  attributionModel: ["Quy tắc ghi nhận referral", "Referral attribution model"],
  activities: ["Cuộc thi và sự kiện", "Competitions and events"],
  kind: ["Loại hoạt động", "Activity type"],
  title: ["Tiêu đề", "Title"],
  description: ["Mô tả", "Description"],
  startsAt: ["Thời điểm bắt đầu (ISO 8601, có múi giờ)", "Start time (ISO 8601 with timezone)"],
  colors: ["Bảng màu thương hiệu", "Brand colors"],
  magenta: ["Hồng GDS", "GDS magenta"],
  violet: ["Tím GDS", "GDS violet"],
  teal: ["Xanh ngọc GDS", "GDS teal"],
  gray: ["Xám", "Gray"],
  periwinkle: ["Xanh tím nhạt", "Periwinkle"],
  mint: ["Xanh bạc hà", "Mint"],
  pink: ["Hồng nhạt", "Pink"],
  lavender: ["Tím nhạt", "Lavender"],
  name: ["Tên", "Name"],
  logoUrl: ["URL logo", "Logo URL"],
  heroImageUrl: ["URL ảnh trang chủ", "Hero image URL"],
  heroTitle: ["Tiêu đề trang chủ", "Hero title"],
  heroDescription: ["Mô tả trang chủ", "Hero description"],
  mascotUrl: ["URL trợ lý AI", "AI mascot URL"],
  pointImageUrl: ["URL hình điểm GDS", "GDS Point image URL"],
  supportEmail: ["Email hỗ trợ", "Support email"],
  supportUrl: ["Liên kết hỗ trợ", "Support link"],
  enabled: ["Bật chức năng", "Enabled"],
  id: ["Mã mục", "Item ID"],
  label: ["Nhãn", "Label"],
  path: ["Đường dẫn", "Destination"],
  basis: ["Cơ sở xét hạng", "Qualification basis"],
  cycleMonths: ["Chu kỳ (tháng)", "Cycle (months)"],
  tiers: ["Hạng thẻ", "Card tiers"],
  code: ["Mã", "Code"],
  threshold: ["Ngưỡng xét hạng", "Qualification threshold"],
  benefits: ["Quyền lợi", "Benefits"],
  expireAfterMonths: ["Thời hạn điểm (tháng)", "Points validity (months)"],
  maxDaily: ["Điểm tối đa/ngày", "Daily points limit"],
  rules: ["Quy tắc", "Rules"],
  event: ["Mã hoạt động", "Activity code"],
  points: ["Số điểm", "Points"],
  items: ["Danh sách đối tác", "Partners"],
  url: ["Website", "Website"],
  category: ["Loại đối tác", "Partner type"],
  connectionStatus: ['Trạng thái kết nối (Admin ghi nhận)', 'Connection status (Admin recorded)'],
  commissionBps: [
    "Hoa hồng (điểm cơ bản, 100 = 1%)",
    "Commission (basis points, 100 = 1%)",
  ],
  attributionDays: ["Thời hạn ghi nhận (ngày)", "Attribution period (days)"],
  holdDays: ["Thời gian chờ (ngày)", "Hold period (days)"],
  minimumWithdrawal: ["Số tiền rút tối thiểu", "Minimum withdrawal"],
  subAffiliateEnabled: ["Bật cộng tác viên cấp dưới", "Enable sub-affiliates"],
  postVideoQuizEnabled: ["Mời làm quiz sau video", "Prompt quiz after video"],
  quizDefaults: ['Mặc định cho quiz mới', 'Defaults for new quizzes'],
  passingScore: ['Điểm đạt mặc định (%)', 'Default passing score (%)'],
  timeLimitMinutes: ['Thời lượng quiz (phút, 0 = không giới hạn)', 'Quiz time limit (minutes, 0 = unlimited)'],
  maxAttempts: ['Số lần làm quiz (0 = không giới hạn)', 'Quiz attempt limit (0 = unlimited)'],
  randomizeQuestions: ['Đảo câu hỏi mặc định', 'Shuffle questions by default'],
  randomizeOptions: ['Đảo đáp án mặc định', 'Shuffle options by default'],
  showCorrectAnswers: ['Hiển thị đáp án đúng mặc định', 'Show correct answers by default'],
  isRequired: ['Quiz bắt buộc mặc định', 'Require quizzes by default'],
  allowInstructorOverrides: ['Cho phép giảng viên chỉnh thiết lập quiz', 'Allow instructors to override quiz settings'],
  descriptionMaxLength: ["Giới hạn ký tự mô tả", "Description character limit"],
  categories: ["Danh mục khóa học", "Course categories"],
  supportEnabled: ["Bật tiếp nhận hỗ trợ", "Enable support requests"],
  partnerApplicationsEnabled: [
    "Bật đăng ký đối tác",
    "Enable partner applications",
  ],
  invoiceRequestsEnabled: ["Bật yêu cầu hóa đơn", "Enable invoice requests"],
  maxAttachmentMb: [
    "Dung lượng tệp tối đa (MB)",
    "Maximum attachment size (MB)",
  ],
  invoiceInstructions: ["Hướng dẫn hóa đơn", "Invoice instructions"],
  vi: ["Tiếng Việt", "Vietnamese"],
  en: ["Tiếng Anh", "English"],
};
const templates: Record<string, unknown> = {
  activities: {
    kind: "event",
    title: { vi: "", en: "" },
    description: { vi: "", en: "" },
    startsAt: "",
    url: "",
    enabled: true,
  },
  navigation: { id: "", label: { vi: "", en: "" }, path: "/", enabled: true },
  tiers: { code: "", name: { vi: "", en: "" }, threshold: 0, benefits: [] },
  benefits: { vi: "", en: "" },
  categories: { vi: "", en: "" },
  rules: { event: "course.completed", points: 0 },
  items: { name: "", logoUrl: "", url: "", category: "school", connectionStatus: "unconfigured" },
};
export function PlatformSettingsForm({
  value,
  onChange,
  field = "settings",
  label,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  field?: string;
  label?: string;
}) {
  const { t } = usePlatform();
  const id = useId();
  const fieldName = label ?? (names[field] ? t(...names[field]) : field);
  if (field === 'connectionStatus') return <label className="platform-form__field" htmlFor={id}>{fieldName}
    <select id={id} value={String(value)} onChange={event => onChange(event.target.value)}>
      <option value="unconfigured">{t('Chưa cấu hình', 'Not configured')}</option>
      <option value="preparing">{t('Đang chuẩn bị', 'Preparing')}</option>
      <option value="testing">{t('Đang kiểm thử', 'Testing')}</option>
      <option value="connected">{t('Đã kết nối', 'Connected')}</option>
      <option value="suspended">{t('Tạm dừng', 'Suspended')}</option>
    </select>
    <small>{t('Trạng thái ghi nhận riêng với duyệt hồ sơ. Không tự bật API/SSO, tạo tài khoản hoặc cộng điểm.', 'Recorded separately from application approval. This does not enable API/SSO, create accounts or award points.')}</small>
  </label>;
  if (Array.isArray(value))
    return (
      <fieldset className="platform-form__array">
        <legend>{fieldName}</legend>
        {value.map((item, index) => (
          <div className="platform-form__item" key={index}>
            <PlatformSettingsForm
              value={item}
              field="item"
              label={fieldName + " " + (index + 1)}
              onChange={(next) =>
                onChange(value.map((v, i) => (i === index ? next : v)))
              }
            />
            <div className="platform-form__row">
              <button
                type="button"
                aria-label={t("Đưa lên", "Move up") + " " + (index + 1)}
                disabled={!index}
                onClick={() => {
                  const next = [...value];
                  [next[index - 1], next[index]] = [
                    next[index],
                    next[index - 1],
                  ];
                  onChange(next);
                }}
              >
                ↑ {t("Đưa lên", "Move up")}
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                {t("Xóa mục", "Remove item")}
              </button>
            </div>
          </div>
        ))}
        {templates[field] !== undefined && (
          <button
            type="button"
            disabled={value.length >= 100}
            onClick={() =>
              onChange([...value, structuredClone(templates[field])])
            }
          >
            + {t("Thêm mục", "Add item")}
          </button>
        )}
      </fieldset>
    );
  if (value && typeof value === "object")
    return (
      <fieldset className="platform-form__object">
        <legend>{fieldName}</legend>
        {field === 'quizDefaults' && <p>{t('Mặc định áp dụng cho quiz mới. Quiz đã tạo giữ nguyên thiết lập.', 'Defaults apply to new quizzes. Existing quizzes retain their settings.')}</p>}
        {Object.entries(value).map(([key, item]) => (
          <PlatformSettingsForm
            key={key}
            field={key}
            value={item}
            onChange={(next) => onChange({ ...value, [key]: next })}
          />
        ))}
      </fieldset>
    );
  if (typeof value === "boolean")
    return (
      <label className="platform-form__check" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {fieldName}
      </label>
    );
  if (field === 'fundingSource') return <label className="platform-form__field" htmlFor={id}>{fieldName}
    <select id={id} value={String(value)} onChange={event => onChange(event.target.value)}>
      <option value="unconfigured">{t('Chưa cấu hình ghi có vào ví', 'Wallet credit not configured')}</option>
      <option value="platform_fee">{t('Từ phần phí nền tảng', 'From the platform fee allocation')}</option>
    </select>
  </label>;
  if (field === 'event') return <label className="platform-form__field" htmlFor={id}>{fieldName}
    <select id={id} value={String(value ?? '')} onChange={event => onChange(event.target.value)} required>
      <option value="" disabled>{t('Chọn hoạt động đã hỗ trợ', 'Choose a supported activity')}</option>
      <option value="course.completed">{t('Hoàn thành khóa học', 'Course completion')}</option>
      {value && value !== 'course.completed' ? <option value={String(value)} disabled>{t('Hoạt động chưa hỗ trợ', 'Unsupported activity')}: {String(value)}</option> : null}
    </select>
  </label>;
  if (field === 'allocationPrecedence') return <label className="platform-form__field" htmlFor={id}>{fieldName}
    <select id={id} value={String(value)} onChange={event => onChange(event.target.value)}>
      <option value="seller_entitlements_first">{t('Bảo toàn phần của người bán trước khi tính hoa hồng', 'Preserve seller allocation before commission funding')}</option>
    </select>
  </label>;
  if (field === "basis" || field === "category" || field === "kind") {
    const options =
      field === "kind"
        ? [
            ["event", t("Sự kiện", "Event")],
            ["competition", t("Cuộc thi", "Competition")],
          ]
        : field === "basis"
          ? [
              ["spend", t("Chi tiêu hợp lệ", "Eligible spending")],
              ["topup", t("Nạp tiền hợp lệ", "Eligible top-ups")],
            ]
          : [
              ["school", t("Trường học", "School")],
              ["business", t("Doanh nghiệp", "Business")],
              ["scholarship", t("Quỹ khuyến học", "Scholarship fund")],
              ["digital", t("Dịch vụ số", "Digital services")],
            ];
    return (
      <label className="platform-form__field" htmlFor={id}>
        {fieldName}
        <select
          id={id}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label className="platform-form__field" htmlFor={id}>
      {fieldName}
      {typeof value === "number" ? (
        <input
          id={id}
          type="number"
          min="0"
          step={field === 'passingScore' ? '0.01' : '1'}
          max={field === 'passingScore' || field === 'maxAttempts' ? 100 : field === 'timeLimitMinutes' ? 1440 : undefined}
          value={value}
          onChange={(e) =>
            onChange(e.target.value === "" ? 0 : Number(e.target.value))
          }
        />
      ) : (
        <input
          id={id}
          type={field.toLowerCase().includes("email") ? "email" : "text"}
          placeholder={field === 'startsAt' ? '2026-12-10T09:00:00+07:00' : undefined}
          maxLength={2000}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
