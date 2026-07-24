import { ImagePlus, Save, X } from "lucide-react";
import type { FormEvent } from "react";
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

interface CourseManagementFormProps {
  course?: CourseSummary | null;
  error: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (input: CourseMutationInput) => Promise<void>;
}

type FormErrors = Partial<Record<keyof CourseMutationInput, string>>;

const MAX_THUMBNAIL_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_THUMBNAIL_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(
    course?.thumbnailUrl ?? "",
  );
  const [level, setLevel] = useState<CourseLevel>(course?.level ?? "beginner");
  const [visibility, setVisibility] = useState<CourseVisibility>(
    course?.visibility ?? "private",
  );
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const titleId = useMemo(() => `course-title-${course?.id ?? "new"}`, [course?.id]);

  useEffect(() => {
    if (!thumbnail) {
      setThumbnailPreviewUrl(course?.thumbnailUrl ?? "");
      return;
    }

    const objectUrl = URL.createObjectURL(thumbnail);
    setThumbnailPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [course?.thumbnailUrl, thumbnail]);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: CourseMutationInput = {
      description: normalizeOptionalText(description),
      level,
      thumbnail: thumbnail ?? undefined,
      title: title.trim(),
      visibility,
    };
    const nextErrors = validateCourseInput(input);

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit(input);
  }

  function selectThumbnail(file: File | undefined) {
    if (!file) {
      setThumbnail(null);
      setFieldErrors((current) => ({ ...current, thumbnail: undefined }));
      return;
    }

    const thumbnailError = validateThumbnail(file);
    if (thumbnailError) {
      setThumbnail(null);
      setFieldErrors((current) => ({
        ...current,
        thumbnail: thumbnailError,
      }));
      return;
    }

    setThumbnail(file);
    setFieldErrors((current) => ({ ...current, thumbnail: undefined }));
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
          <div className="course-management-form__thumbnail">
            <div className="course-management-form__thumbnail-preview">
              {thumbnailPreviewUrl ? (
                <img
                  alt="Xem trước ảnh đại diện khóa học"
                  src={thumbnailPreviewUrl}
                />
              ) : (
                <div className="course-management-form__thumbnail-empty">
                  <ImagePlus aria-hidden="true" />
                  <span>Chưa chọn ảnh đại diện</span>
                </div>
              )}
            </div>
            <div className="course-management-form__thumbnail-controls">
              <label className="course-management-form__file-picker">
                <ImagePlus aria-hidden="true" />
                <span>
                  {thumbnail
                    ? "Đổi ảnh"
                    : course?.thumbnailUrl
                      ? "Thay ảnh"
                      : "Chọn ảnh"}
                </span>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  aria-invalid={Boolean(fieldErrors.thumbnail)}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    selectThumbnail(file);
                    if (file && validateThumbnail(file)) {
                      event.currentTarget.value = "";
                    }
                  }}
                  type="file"
                />
              </label>
              <p>PNG, JPG hoặc WebP · tối đa 5 MB · khuyến nghị tỉ lệ 16:9</p>
            </div>
          </div>
          {fieldErrors.thumbnail ? <small>{fieldErrors.thumbnail}</small> : null}
        </div>

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

function validateCourseInput(input: CourseMutationInput): FormErrors {
  const errors: FormErrors = {};

  if (!input.title) {
    errors.title = "Vui lòng nhập tên khóa học.";
  } else if (input.title.length > 180) {
    errors.title = "Tên khóa học tối đa 180 ký tự.";
  }

  if (input.description && input.description.length > 4000) {
    errors.description = "Mô tả tối đa 4000 ký tự.";
  }

  if (input.thumbnail) {
    const thumbnailError = validateThumbnail(input.thumbnail);
    if (thumbnailError) errors.thumbnail = thumbnailError;
  }

  return errors;
}

function validateThumbnail(file: File): string | undefined {
  if (!SUPPORTED_THUMBNAIL_TYPES.has(file.type)) {
    return "Ảnh đại diện chỉ hỗ trợ PNG, JPG hoặc WebP.";
  }

  if (file.size > MAX_THUMBNAIL_FILE_SIZE_BYTES) {
    return "Ảnh đại diện không được vượt quá 5 MB.";
  }

  return undefined;
}
