import { CheckCircle2, FileUp, RotateCcw, Save, Trash2, X } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useRef, useState } from "react";
import type {
  LessonMutationInput,
  LessonDetail,
  LessonType,
} from "../../../../../services/course.service";
import { courseService } from "../../../../../services/course.service";
import "./LessonManagementForm.css";

const typeOptions: Array<{ label: string; value: LessonType }> = [
  { label: "Video", value: "video" },
  { label: "PDF", value: "pdf" },
  { label: "Bài viết", value: "article" },
];

interface LessonManagementFormProps {
  courseId: string;
  error: string | null;
  isSaving: boolean;
  lesson?: LessonDetail | null;
  onCancel: () => void;
  onSubmit: (input: LessonMutationInput) => Promise<void>;
}

type FormErrors = Partial<Record<keyof LessonMutationInput, string>>;

export function LessonManagementForm({
  courseId,
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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoStorageKey, setVideoStorageKey] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentStorageKey, setDocumentStorageKey] = useState<string | null>(null);
  const [documentUploadError, setDocumentUploadError] = useState<string | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const videoAbortController = useRef<AbortController | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const formTitleId = useMemo(() => `lesson-form-${lesson?.id ?? "new"}`, [lesson?.id]);

  async function uploadVideo(file: File) {
    videoAbortController.current?.abort();
    const previousStorageKey = videoStorageKey;
    if (previousStorageKey) void discardNewMedia(previousStorageKey);
    const controller = new AbortController();
    videoAbortController.current = controller;
    setVideoFile(file);
    setVideoStorageKey(null);
    setVideoProgress(0);
    setVideoUploadError(null);
    setIsUploadingVideo(true);
    try {
      const result = await courseService.uploadLessonVideo(
        courseId,
        file,
        (loaded, total) => setVideoProgress(Math.round((loaded / total) * 100)),
        controller.signal,
      );
      setVideoStorageKey(result.storageKey);
      setVideoProgress(100);
    } catch (uploadError) {
      if (!(uploadError instanceof DOMException && uploadError.name === "AbortError")) {
        setVideoUploadError(
          uploadError instanceof Error ? uploadError.message : "Upload video thất bại.",
        );
      }
    } finally {
      if (videoAbortController.current === controller) setIsUploadingVideo(false);
    }
  }

  async function selectVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await uploadVideo(file);
  }

  async function uploadDocument(file: File) {
    const previousStorageKey = documentStorageKey;
    if (previousStorageKey) void discardNewMedia(previousStorageKey);
    setDocumentFile(file);
    setDocumentStorageKey(null);
    setDocumentUploadError(null);
    setIsUploadingDocument(true);
    try {
      const result = await courseService.uploadLessonDocument(courseId, file);
      setDocumentStorageKey(result.storageKey);
    } catch (uploadError) {
      setDocumentUploadError(
        uploadError instanceof Error ? uploadError.message : "Upload tài liệu thất bại.",
      );
    } finally {
      setIsUploadingDocument(false);
    }
  }

  async function selectDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await uploadDocument(file);
  }

  async function discardNewMedia(storageKey: string | null) {
    if (!storageKey) return;
    try {
      await courseService.discardLessonMedia(courseId, storageKey);
    } catch {
      // Cleanup is best-effort; the backend owns authoritative reference checks.
    }
  }

  async function cancelForm() {
    videoAbortController.current?.abort();
    await Promise.all([
      discardNewMedia(videoStorageKey),
      discardNewMedia(documentStorageKey),
    ]);
    onCancel();
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: LessonMutationInput = {
      content: normalizeOptionalText(content),
      ...(type !== "pdf"
        ? { documentStorageKey: null, documentUrl: null }
        : documentStorageKey
          ? { documentStorageKey, documentUrl: null }
          : {}),
      durationMinutes: normalizeOptionalNumber(durationMinutes),
      isPreview,
      orderIndex: Number(orderIndex),
      slug: slug.trim().toLowerCase(),
      title: title.trim(),
      type,
      ...(type !== "video"
        ? { videoStorageKey: null, videoUrl: null }
        : videoStorageKey
          ? { videoStorageKey, videoUrl: null }
          : {}),
    };
    const nextErrors = validateLessonInput(input);

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (type === "video" && !videoStorageKey && !lesson?.videoUrl) {
      setVideoUploadError("Vui lòng upload video trước khi lưu bài học.");
      return;
    }
    if (type === "pdf" && !documentStorageKey && !lesson?.documentUrl) {
      setDocumentUploadError("Vui lòng upload PDF trước khi lưu bài học.");
      return;
    }

    await onSubmit(input);
    setVideoStorageKey(null);
    setDocumentStorageKey(null);
  }

  return (
    <section className="lesson-management-form" aria-labelledby={formTitleId}>
      <header className="lesson-management-form__header">
        <div>
          <span>{lesson ? "Cập nhật bài học" : "Bài học mới"}</span>
          <h2 id={formTitleId}>{lesson ? lesson.title : "Tạo bài học"}</h2>
        </div>
        <button aria-label="Đóng biểu mẫu" onClick={() => void cancelForm()} type="button">
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
          <select
            onChange={(event) => {
              const nextType = event.target.value as LessonType;
              if (nextType !== "video" && videoStorageKey) {
                void discardNewMedia(videoStorageKey);
                setVideoStorageKey(null);
                setVideoFile(null);
              }
              if (nextType !== "pdf" && documentStorageKey) {
                void discardNewMedia(documentStorageKey);
                setDocumentStorageKey(null);
                setDocumentFile(null);
              }
              setType(nextType);
            }}
            value={type}
          >
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

        {type === "video" ? (
          <div className="lesson-management-form__wide lesson-media-upload">
            <span>Video bài học</span>
            <label className="lesson-media-upload__picker">
              <FileUp aria-hidden="true" />
              <strong>{videoFile ? "Đổi video" : "Chọn video"}</strong>
              <input
                accept="video/mp4,video/webm,video/quicktime"
                aria-label="Chọn video bài học"
                disabled={isUploadingVideo || isSaving}
                onChange={(event) => void selectVideo(event)}
                type="file"
              />
            </label>
            {videoFile ? (
              <div className="lesson-media-upload__status" aria-live="polite">
                <div><strong>{videoFile.name}</strong><span>{formatFileSize(videoFile.size)}</span></div>
                <progress max="100" value={videoProgress}>{videoProgress}%</progress>
                <p>
                  {isUploadingVideo
                    ? `Đang upload… ${videoProgress}%`
                    : videoStorageKey
                      ? "✓ Upload hoàn tất"
                      : videoUploadError ?? "Sẵn sàng upload"}
                </p>
                <div className="lesson-media-upload__controls">
                  {videoUploadError ? (
                    <button onClick={() => void uploadVideo(videoFile)} type="button">
                      <RotateCcw aria-hidden="true" /> Thử lại
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      videoAbortController.current?.abort();
                      void discardNewMedia(videoStorageKey);
                      setVideoFile(null);
                      setVideoStorageKey(null);
                      setVideoProgress(0);
                    }}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" /> Xóa
                  </button>
                </div>
              </div>
            ) : lesson?.videoUrl ? (
              <p className="lesson-media-upload__existing"><CheckCircle2 aria-hidden="true" /> Video hiện tại vẫn được giữ. Chọn file để thay thế.</p>
            ) : null}
            {!videoFile && videoUploadError ? <small>{videoUploadError}</small> : null}
          </div>
        ) : null}

        {type === "pdf" ? (
          <div className="lesson-management-form__wide lesson-media-upload">
            <span>Tài liệu bài học</span>
            <label className="lesson-media-upload__picker">
              <FileUp aria-hidden="true" />
              <strong>{documentFile ? "Đổi PDF" : "Chọn PDF"}</strong>
              <input
                accept="application/pdf"
                aria-label="Chọn PDF bài học"
                disabled={isUploadingDocument || isSaving}
                onChange={(event) => void selectDocument(event)}
                type="file"
              />
            </label>
            {documentFile ? (
              <div className="lesson-media-upload__status" aria-live="polite">
                <div><strong>{documentFile.name}</strong><span>{formatFileSize(documentFile.size)}</span></div>
                <p>{isUploadingDocument ? "Đang upload…" : documentStorageKey ? "✓ Upload hoàn tất" : documentUploadError}</p>
                <div className="lesson-media-upload__controls">
                  {documentUploadError ? (
                    <button onClick={() => void uploadDocument(documentFile)} type="button">
                      <RotateCcw aria-hidden="true" /> Thử lại
                    </button>
                  ) : null}
                  <button
                    disabled={isUploadingDocument}
                    onClick={() => {
                      void discardNewMedia(documentStorageKey);
                      setDocumentFile(null);
                      setDocumentStorageKey(null);
                    }}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" /> Xóa
                  </button>
                </div>
              </div>
            ) : lesson?.documentUrl ? (
              <p className="lesson-media-upload__existing"><CheckCircle2 aria-hidden="true" /> PDF hiện tại vẫn được giữ. Chọn file để thay thế.</p>
            ) : null}
            {!documentFile && documentUploadError ? <small>{documentUploadError}</small> : null}
          </div>
        ) : null}

        <div className="lesson-management-form__actions">
          <button onClick={() => void cancelForm()} type="button">
            Hủy
          </button>
          <button disabled={isSaving || isUploadingVideo || isUploadingDocument} type="submit">
            <Save aria-hidden="true" />
            {isSaving ? "Đang lưu..." : "Lưu bài học"}
          </button>
        </div>
      </form>
    </section>
  );
}

function normalizeOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  return Number(value);
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
