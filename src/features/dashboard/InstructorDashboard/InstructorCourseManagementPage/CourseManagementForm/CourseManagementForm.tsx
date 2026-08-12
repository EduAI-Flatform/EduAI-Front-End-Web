import { ImagePlus, Save, Trash2, X } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type {
  CourseLevel,
  CourseMutationInput,
  CourseSummary,
  CourseVisibility,
} from "../../../../../services/course.service";
import "./CourseManagementForm.css";

const levelOptions: Array<{ label: string; value: CourseLevel }> = [
  { label: "Cơ bản", value: "beginner" },
  { label: "Trung cấp", value: "intermediate" },
  { label: "Nâng cao", value: "advanced" },
];

const visibilityOptions: Array<{ label: string; value: CourseVisibility }> = [
  { label: "Riêng tư", value: "private" },
  { label: "Công khai", value: "public" },
];
const MAX_COURSE_BADGE_LENGTH = 50;
const MAX_COURSE_THUMBNAIL_SIZE = 5 * 1024 * 1024;
const COURSE_THUMBNAIL_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface CourseManagementFormProps {
  course?: CourseSummary | null;
  error: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (input: CourseMutationInput) => Promise<void>;
}

type FormErrors = Partial<Record<keyof CourseMutationInput, string>>;

export function CourseManagementForm({
  course,
  error,
  isSaving,
  onCancel,
  onSubmit,
}: CourseManagementFormProps) {
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [badge, setBadge] = useState(course?.badge ?? "");
  const [priceCurrency, setPriceCurrency] = useState(
    course?.price?.currency ?? "VND",
  );
  const [priceAmount, setPriceAmount] = useState(
    course?.price
      ? String(
          course.price.amountMinor /
            10 ** getCurrencyFractionDigits(course.price.currency),
        )
      : "",
  );
  const [level, setLevel] = useState<CourseLevel>(course?.level ?? "beginner");
  const [visibility, setVisibility] = useState<CourseVisibility>(
    course?.visibility ?? "private",
  );
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const titleId = useMemo(() => `course-title-${course?.id ?? "new"}`, [course?.id]);
  const thumbnailPreview = useMemo(() => {
    if (thumbnail && typeof URL.createObjectURL === "function") {
      return URL.createObjectURL(thumbnail);
    }
    return removeThumbnail ? null : course?.thumbnailUrl ?? null;
  }, [course?.thumbnailUrl, removeThumbnail, thumbnail]);

  useEffect(() => {
    return () => {
      if (thumbnailPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [thumbnailPreview]);

  function selectThumbnail(event: ChangeEvent<HTMLInputElement>) {
    setThumbnail(event.target.files?.[0] ?? null);
    setRemoveThumbnail(false);
    setFieldErrors((current) => ({ ...current, thumbnail: undefined }));
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: CourseMutationInput = {
      description: normalizeOptionalText(description),
      badge: normalizeOptionalText(badge),
      level,
      priceAmountMinor: priceAmount.trim()
        ? Math.round(
            Number(priceAmount) *
              10 ** getCurrencyFractionDigits(priceCurrency),
          )
        : null,
      priceCurrency: priceAmount.trim() ? priceCurrency.toUpperCase() : null,
      thumbnail,
      ...(removeThumbnail ? { thumbnailUrl: null } : {}),
      title: title.trim(),
      visibility,
    };
    const nextErrors = validateCourseInput(input);

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit(input);
  }

  return (
    <section className="course-management-form" aria-labelledby={titleId}>
      <header className="course-management-form__header">
        <div>
          <span>{course ? "Cập nhật khóa học" : "Khóa học mới"}</span>
          <h2 id={titleId}>{course ? course.title : "Tạo khóa học"}</h2>
        </div>
        <button aria-label="Đóng biểu mẫu" onClick={onCancel} type="button">
          <X aria-hidden="true" />
        </button>
      </header>

      {error ? (
        <p className="course-management-form__alert" role="alert">
          {error}
        </p>
      ) : null}

      <form className="course-management-form__body" onSubmit={submitForm}>
        <label>
          <span>Tên khóa học</span>
          <input
            aria-invalid={Boolean(fieldErrors.title)}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nhập tên khóa học"
            type="text"
            value={title}
          />
          {fieldErrors.title ? <small>{fieldErrors.title}</small> : null}
        </label>

        <label className="course-management-form__wide">
          <span>Mô tả</span>
          <textarea
            aria-invalid={Boolean(fieldErrors.description)}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Tóm tắt mục tiêu và nội dung chính của khóa học"
            rows={4}
            value={description}
          />
          {fieldErrors.description ? <small>{fieldErrors.description}</small> : null}
        </label>

        <div className="course-management-form__wide course-management-form__thumbnail-field">
          <span>Ảnh đại diện</span>
          <div
            className="course-management-form__thumbnail"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) {
                setThumbnail(file);
                setRemoveThumbnail(false);
              }
            }}
          >
            <div className="course-management-form__thumbnail-preview">
              {thumbnailPreview ? (
                <img alt="Xem trước ảnh khóa học" src={thumbnailPreview} />
              ) : (
                <div className="course-management-form__thumbnail-empty">
                  <ImagePlus aria-hidden="true" />
                  <span>Kéo ảnh vào đây hoặc chọn từ máy</span>
                </div>
              )}
            </div>
            <div className="course-management-form__thumbnail-controls">
              <label className="course-management-form__file-picker">
                <ImagePlus aria-hidden="true" />
                <span>{thumbnailPreview ? "Đổi ảnh" : "Chọn ảnh"}</span>
                <input
                  accept={COURSE_THUMBNAIL_TYPES.join(",")}
                  aria-label="Chọn ảnh khóa học"
                  disabled={isSaving}
                  onChange={selectThumbnail}
                  type="file"
                />
              </label>
              {thumbnail ? <strong>{thumbnail.name}</strong> : null}
              <p>JPG, PNG, WebP · tối đa 5 MB</p>
              {thumbnailPreview ? (
                <button
                  className="course-management-form__remove-thumbnail"
                  disabled={isSaving}
                  onClick={() => {
                    setThumbnail(null);
                    setRemoveThumbnail(Boolean(course?.thumbnailUrl));
                  }}
                  type="button"
                >
                  <Trash2 aria-hidden="true" /> Xóa ảnh
                </button>
              ) : null}
            </div>
          </div>
          {fieldErrors.thumbnail ? <small>{fieldErrors.thumbnail}</small> : null}
        </div>

        <label>
          <span>Huy hiệu</span>
          <input
            aria-invalid={Boolean(fieldErrors.badge)}
            maxLength={MAX_COURSE_BADGE_LENGTH}
            onChange={(event) => setBadge(event.target.value)}
            placeholder="Ví dụ: Bán chạy"
            type="text"
            value={badge}
          />
          {fieldErrors.badge ? <small>{fieldErrors.badge}</small> : null}
        </label>

        <label>
          <span>Giá khóa học</span>
          <input
            aria-invalid={Boolean(fieldErrors.priceAmountMinor)}
            min="0"
            onChange={(event) => setPriceAmount(event.target.value)}
            placeholder="1299000"
            step={getCurrencyFractionDigits(priceCurrency) === 0 ? "1" : "0.01"}
            type="number"
            value={priceAmount}
          />
          {fieldErrors.priceAmountMinor ? (
            <small>{fieldErrors.priceAmountMinor}</small>
          ) : null}
        </label>

        <label>
          <span>Tiền tệ</span>
          <select
            disabled={!priceAmount.trim()}
            onChange={(event) => setPriceCurrency(event.target.value)}
            value={priceCurrency}
          >
            <option value="VND">VND</option>
            <option value="USD">USD</option>
          </select>
        </label>

        <label>
          <span>Cấp độ</span>
          <select
            onChange={(event) => setLevel(event.target.value as CourseLevel)}
            value={level}
          >
            {levelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Hiển thị</span>
          <select
            onChange={(event) =>
              setVisibility(event.target.value as CourseVisibility)
            }
            value={visibility}
          >
            {visibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="course-management-form__actions">
          <button onClick={onCancel} type="button">
            Hủy
          </button>
          <button disabled={isSaving} type="submit">
            <Save aria-hidden="true" />
            {isSaving ? "Đang lưu..." : "Lưu khóa học"}
          </button>
        </div>
      </form>
    </section>
  );
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateCourseInput(input: CourseMutationInput): FormErrors {
  const errors: FormErrors = {};

  if (!input.title) {
    errors.title = "Vui lòng nhập tên khóa học.";
  } else if (input.title.length > 180) {
    errors.title = "Tên khóa học tối đa 180 ký tự.";
  }

  if (input.description && input.description.length > 4000) {
    errors.description = "Mô tả tối đa 4000 ký tự.";
  }

  if (input.badge && input.badge.length > MAX_COURSE_BADGE_LENGTH) {
    errors.badge = "Huy hiệu tối đa 50 ký tự.";
  }

  if (
    input.priceAmountMinor !== null &&
    input.priceAmountMinor !== undefined &&
    (!Number.isSafeInteger(input.priceAmountMinor) ||
      input.priceAmountMinor < 0)
  ) {
    errors.priceAmountMinor = "Giá phải là số không âm hợp lệ.";
  }

  if (input.thumbnail && !COURSE_THUMBNAIL_TYPES.includes(input.thumbnail.type)) {
    errors.thumbnail = "Ảnh phải có định dạng JPG, PNG hoặc WebP.";
  } else if (input.thumbnail && input.thumbnail.size > MAX_COURSE_THUMBNAIL_SIZE) {
    errors.thumbnail = "Ảnh khóa học phải nhỏ hơn hoặc bằng 5 MB.";
  }

  return errors;
}

function getCurrencyFractionDigits(currency: string): number {
  try {
    return new Intl.NumberFormat("vi-VN", {
      currency,
      style: "currency",
    }).resolvedOptions().maximumFractionDigits ?? 0;
  } catch {
    return 0;
  }
}
