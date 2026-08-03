import { Save, X } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import type {
  LessonMutationInput,
  LessonDetail,
  LessonType,
} from "../../../../../services/course.service";
import "./LessonManagementForm.css";

const typeOptions: Array<{ label: string; value: LessonType }> = [
  { label: "Video", value: "video" },
  { label: "PDF", value: "pdf" },
  { label: "Bài viết", value: "article" },
];

interface LessonManagementFormProps {
  error: string | null;
  isSaving: boolean;
  lesson?: LessonDetail | null;
  onCancel: () => void;
  onSubmit: (input: LessonMutationInput) => Promise<void>;
}

type FormErrors = Partial<Record<keyof LessonMutationInput, string>>;

export function LessonManagementForm({
  error,
  isSaving,
  lesson,
  onCancel,
  onSubmit,
}: LessonManagementFormProps) {
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [slug, setSlug] = useState(lesson?.slug ?? "");
  const [type, setType] = useState<LessonType>(lesson?.type ?? "video");
  const [orderIndex, setOrderIndex] = useState(String(lesson?.orderIndex ?? 0));
  const [durationMinutes, setDurationMinutes] = useState(
    lesson?.durationMinutes === null || lesson?.durationMinutes === undefined
      ? ""
      : String(lesson.durationMinutes),
  );
  const [isPreview, setIsPreview] = useState(Boolean(lesson?.isPreview));
  const [content, setContent] = useState(lesson?.content ?? "");
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl ?? "");
  const [documentUrl, setDocumentUrl] = useState(lesson?.documentUrl ?? "");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const formTitleId = useMemo(() => `lesson-form-${lesson?.id ?? "new"}`, [lesson?.id]);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: LessonMutationInput = {
      content: normalizeOptionalText(content),
      documentUrl: normalizeOptionalText(documentUrl),
      durationMinutes: normalizeOptionalNumber(durationMinutes),
      isPreview,
      orderIndex: Number(orderIndex),
      slug: slug.trim().toLowerCase(),
      title: title.trim(),
      type,
      videoUrl: normalizeOptionalText(videoUrl),
    };
    const nextErrors = validateLessonInput(input);

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit(input);
  }

  return (
    <section className="lesson-management-form" aria-labelledby={formTitleId}>
      <header className="lesson-management-form__header">
        <div>
          <span>{lesson ? "Cập nhật bài học" : "Bài học mới"}</span>
          <h2 id={formTitleId}>{lesson ? lesson.title : "Tạo bài học"}</h2>
        </div>
        <button aria-label="Đóng biểu mẫu" onClick={onCancel} type="button">
          <X aria-hidden="true" />
        </button>
      </header>

      {error ? (
        <p className="lesson-management-form__alert" role="alert">
          {error}
        </p>
      ) : null}

      <form className="lesson-management-form__body" onSubmit={submitForm}>
        <label>
          <span>Tên bài học</span>
          <input
            aria-invalid={Boolean(fieldErrors.title)}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nhập tên bài học"
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
            placeholder="gioi-thieu"
            type="text"
            value={slug}
          />
          {fieldErrors.slug ? <small>{fieldErrors.slug}</small> : null}
        </label>

        <label>
          <span>Loại bài</span>
          <select onChange={(event) => setType(event.target.value as LessonType)} value={type}>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Thứ tự</span>
          <input
            aria-invalid={Boolean(fieldErrors.orderIndex)}
            min="0"
            onChange={(event) => setOrderIndex(event.target.value)}
            type="number"
            value={orderIndex}
          />
          {fieldErrors.orderIndex ? <small>{fieldErrors.orderIndex}</small> : null}
        </label>

        <label>
          <span>Thời lượng phút</span>
          <input
            aria-invalid={Boolean(fieldErrors.durationMinutes)}
            min="0"
            onChange={(event) => setDurationMinutes(event.target.value)}
            placeholder="15"
            type="number"
            value={durationMinutes}
          />
          {fieldErrors.durationMinutes ? <small>{fieldErrors.durationMinutes}</small> : null}
        </label>

        <label className="lesson-management-form__check">
          <input
            checked={isPreview}
            onChange={(event) => setIsPreview(event.target.checked)}
            type="checkbox"
          />
          <span>Cho phép học thử</span>
        </label>

        <label className="lesson-management-form__wide">
          <span>Nội dung bài viết</span>
          <textarea
            aria-invalid={Boolean(fieldErrors.content)}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Nhập nội dung bài học"
            rows={5}
            value={content}
          />
          {fieldErrors.content ? <small>{fieldErrors.content}</small> : null}
        </label>

        <label className="lesson-management-form__wide">
          <span>URL video</span>
          <input
            aria-invalid={Boolean(fieldErrors.videoUrl)}
            onChange={(event) => setVideoUrl(event.target.value)}
            placeholder="https://... hoặc /demo-assets/..."
            type="text"
            value={videoUrl}
          />
          {fieldErrors.videoUrl ? <small>{fieldErrors.videoUrl}</small> : null}
        </label>

        <label className="lesson-management-form__wide">
          <span>URL tài liệu</span>
          <input
            aria-invalid={Boolean(fieldErrors.documentUrl)}
            onChange={(event) => setDocumentUrl(event.target.value)}
            placeholder="https://... hoặc /demo-assets/..."
            type="text"
            value={documentUrl}
          />
          {fieldErrors.documentUrl ? <small>{fieldErrors.documentUrl}</small> : null}
        </label>

        <div className="lesson-management-form__actions">
          <button onClick={onCancel} type="button">
            Hủy
          </button>
          <button disabled={isSaving} type="submit">
            <Save aria-hidden="true" />
            {isSaving ? "Đang lưu..." : "Lưu bài học"}
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

function normalizeOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  return Number(value);
}

function validateLessonInput(input: LessonMutationInput): FormErrors {
  const errors: FormErrors = {};

  if (!input.title) {
    errors.title = "Vui lòng nhập tên bài học.";
  } else if (input.title.length > 180) {
    errors.title = "Tên bài học tối đa 180 ký tự.";
  }

  if (!input.slug) {
    errors.slug = "Vui lòng nhập slug.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    errors.slug = "Slug chỉ gồm chữ thường, số và dấu gạch ngang.";
  } else if (input.slug.length > 120) {
    errors.slug = "Slug tối đa 120 ký tự.";
  }

  if (!Number.isInteger(input.orderIndex) || input.orderIndex < 0) {
    errors.orderIndex = "Thứ tự phải là số nguyên từ 0.";
  }

  if (
    input.durationMinutes !== null &&
    input.durationMinutes !== undefined &&
    (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 0)
  ) {
    errors.durationMinutes = "Thời lượng phải là số nguyên từ 0.";
  }

  if (input.content && input.content.length > 10000) {
    errors.content = "Nội dung tối đa 10000 ký tự.";
  }

  if (
    input.videoUrl &&
    !/^https?:\/\//i.test(input.videoUrl) &&
    !input.videoUrl.startsWith("/")
  ) {
    errors.videoUrl = "URL video phải là http(s) hoặc đường dẫn nội bộ.";
  }

  if (
    input.documentUrl &&
    !/^https?:\/\//i.test(input.documentUrl) &&
    !input.documentUrl.startsWith("/")
  ) {
    errors.documentUrl = "URL tài liệu phải là http(s) hoặc đường dẫn nội bộ.";
  }

  return errors;
}
