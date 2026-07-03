import { Save, X } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
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

export function CourseManagementForm({
  course,
  error,
  isSaving,
  onCancel,
  onSubmit,
}: CourseManagementFormProps) {
  const [title, setTitle] = useState(course?.title ?? "");
  const [slug, setSlug] = useState(course?.slug ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(course?.thumbnailUrl ?? "");
  const [level, setLevel] = useState<CourseLevel>(course?.level ?? "beginner");
  const [visibility, setVisibility] = useState<CourseVisibility>(
    course?.visibility ?? "private",
  );
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const titleId = useMemo(() => `course-title-${course?.id ?? "new"}`, [course?.id]);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: CourseMutationInput = {
      description: normalizeOptionalText(description),
      level,
      slug: slug.trim().toLowerCase(),
      thumbnailUrl: normalizeOptionalText(thumbnailUrl),
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

        <label>
          <span>Slug</span>
          <input
            aria-invalid={Boolean(fieldErrors.slug)}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="ai-foundations"
            type="text"
            value={slug}
          />
          {fieldErrors.slug ? <small>{fieldErrors.slug}</small> : null}
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

        <label className="course-management-form__wide">
          <span>Ảnh đại diện</span>
          <input
            aria-invalid={Boolean(fieldErrors.thumbnailUrl)}
            onChange={(event) => setThumbnailUrl(event.target.value)}
            placeholder="https://..."
            type="url"
            value={thumbnailUrl}
          />
          {fieldErrors.thumbnailUrl ? <small>{fieldErrors.thumbnailUrl}</small> : null}
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

function validateCourseInput(input: CourseMutationInput): FormErrors {
  const errors: FormErrors = {};

  if (!input.title) {
    errors.title = "Vui lòng nhập tên khóa học.";
  } else if (input.title.length > 180) {
    errors.title = "Tên khóa học tối đa 180 ký tự.";
  }

  if (!input.slug) {
    errors.slug = "Vui lòng nhập slug.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    errors.slug = "Slug chỉ gồm chữ thường, số và dấu gạch ngang.";
  } else if (input.slug.length > 120) {
    errors.slug = "Slug tối đa 120 ký tự.";
  }

  if (input.description && input.description.length > 4000) {
    errors.description = "Mô tả tối đa 4000 ký tự.";
  }

  if (input.thumbnailUrl && !/^https?:\/\//i.test(input.thumbnailUrl)) {
    errors.thumbnailUrl = "Ảnh đại diện phải là URL có http hoặc https.";
  }

  return errors;
}
