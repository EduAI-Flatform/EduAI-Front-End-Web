import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  assignmentService,
  getAssignmentErrorMessage,
  type AssignmentSummary,
  type SubmissionSummary,
} from "../../../services/assignment.service";
import "./AssignmentSubmissionPage.css";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function AssignmentSubmissionPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [assignment, setAssignment] = useState<AssignmentSummary | null>(null);
  const [submission, setSubmission] = useState<SubmissionSummary | null>(null);
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadAssignment = useCallback(async () => {
    if (!assignmentId) {
      setError("Không tìm thấy bài tập.");
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const assignmentDetail = await assignmentService.getAssignment(assignmentId);
      setAssignment(assignmentDetail);
      try {
        setSubmission(await assignmentService.getMySubmission(assignmentId));
      } catch {
        setSubmission(null);
      }
    } catch (loadError) {
      setError(getAssignmentErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    void loadAssignment();
  }, [loadAssignment]);

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignmentId || !assignment) return;

    const normalizedContent = content.trim();
    const normalizedFileUrl = fileUrl.trim();
    if (!normalizedContent && !normalizedFileUrl && !file) {
      setFormError("Vui lòng nhập nội dung, đường dẫn bài làm hoặc tệp.");
      return;
    }
    if (file && file.size > (assignment.maxFileSizeBytes ?? 20 * 1024 * 1024)) {
      setFormError(`Tệp phải nhỏ hơn ${(formatFileSize(assignment.maxFileSizeBytes ?? 20 * 1024 * 1024))}.`);
      return;
    }
    if (file && assignment.allowedFileMimeTypes?.length && !assignment.allowedFileMimeTypes.includes(file.type)) {
      setFormError("Loại file này không được phép cho bài tập.");
      return;
    }
    if (normalizedFileUrl && !/^https:\/\//i.test(normalizedFileUrl)) {
      setFormError("Liên kết tệp phải bắt đầu bằng https://.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const nextSubmission = await assignmentService.submitAssignment(assignmentId, {
        content: normalizedContent || null,
        fileUrl: normalizedFileUrl || null,
        file,
      });
      setSubmission(nextSubmission);
      setFile(null);
    } catch (submitError) {
      setFormError(getAssignmentErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="assignment-submission-page" aria-busy="true">
        <div className="assignment-submission-skeleton assignment-submission-skeleton--hero" />
        <div className="assignment-submission-skeleton assignment-submission-skeleton--body" />
      </main>
    );
  }

  if (error || !assignment) {
    return (
      <main className="assignment-submission-page">
        <section className="assignment-submission-state" role="alert">
          <AlertCircle aria-hidden="true" />
          <h1>Chưa thể mở bài tập</h1>
          <p>{error ?? "Bài tập không tồn tại hoặc bạn chưa có quyền truy cập."}</p>
          <button onClick={() => void loadAssignment()} type="button">
            <RefreshCw aria-hidden="true" />
            Thử lại
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="assignment-submission-page">
      <header className="assignment-submission-hero">
        <Link to={`/learning/${assignment.courseId}`}>
          <ArrowLeft aria-hidden="true" />
          Quay lại khóa học
        </Link>
        <div>
          <span>Bài tập</span>
          <h1>{assignment.title}</h1>
          <p>{assignment.description || "Nộp bài bằng nội dung, đường dẫn hoặc file theo yêu cầu."}</p>
        </div>
        <aside aria-label="Thông tin bài tập">
          <strong>{assignment.maxScore} điểm</strong>
          <span>
            <Clock3 aria-hidden="true" />
            {assignment.dueDate ? dateFormatter.format(new Date(assignment.dueDate)) : "Không hạn nộp"}
          </span>
        </aside>
      </header>

      <section className="assignment-submission-layout">
        <form className="assignment-submit-form" onSubmit={submitAssignment}>
          <header>
            <FileText aria-hidden="true" />
            <div>
              <span>Bài làm của bạn</span>
          <h2>{submission ? "Đã nộp bài" : "Nộp bài"}</h2>
            </div>
          </header>
          {submission ? (
            <SubmissionPreview submission={submission} />
          ) : (
            <>
              <label>
                <span>Nội dung bài làm</span>
                <textarea
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Nhập nội dung bài làm"
                  rows={9}
                  value={content}
                />
              </label>
              <label>
                <span>Đường dẫn bài làm</span>
                <input
                  onChange={(event) => setFileUrl(event.target.value)}
                  placeholder="https://..."
                  type="url"
                  value={fileUrl}
                />
              </label>
              <label>
                <span>Chọn file ({formatMimeTypes(assignment.allowedFileMimeTypes)} · tối đa {formatFileSize(assignment.maxFileSizeBytes ?? 20 * 1024 * 1024)})</span>
                <input
                  accept={assignment.allowedFileMimeTypes?.join(",") || ".pdf,.docx,.zip,.jpg,.jpeg,.png"}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
              {file ? (
                <div className="assignment-selected-file">
                  <FileText aria-hidden="true" />
                  <span>{file.name} ({file.type || "không rõ loại"} · {formatFileSize(file.size)})</span>
                  <button aria-label="Bỏ tệp đã chọn" onClick={() => setFile(null)} type="button">
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              {assignment.instructions || assignment.rubric ? (
                <section className="assignment-requirements">
                  {assignment.instructions ? <div><strong>Yêu cầu đầu ra</strong><p>{assignment.instructions}</p></div> : null}
                  {assignment.rubric ? <div><strong>Tiêu chí chấm</strong><p>{assignment.rubric}</p></div> : null}
                </section>
              ) : null}
              {formError ? (
                <p className="assignment-submit-form__alert" role="alert">
                  {formError}
                </p>
              ) : null}
              <button disabled={isSubmitting} type="submit">
                {isSubmitting ? <Loader2 aria-hidden="true" className="is-spinning" /> : <Send aria-hidden="true" />}
                {isSubmitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            </>
          )}
        </form>

        <aside className="assignment-grade-card" aria-label="Điểm bài tập">
          <span>Kết quả</span>
          {submission?.status === "graded" ? (
            <>
              <CheckCircle2 aria-hidden="true" />
              <strong>{submission.score}/{assignment.maxScore}</strong>
              <p>{submission.feedback || "Giảng viên chưa để lại nhận xét."}</p>
            </>
          ) : submission ? (
            <>
              <Clock3 aria-hidden="true" />
              <strong>Đang chờ chấm</strong>
              <p>Bài đã nộp, điểm sẽ hiển thị khi giảng viên hoàn tất chấm.</p>
            </>
          ) : (
            <>
              <FileText aria-hidden="true" />
              <strong>Chưa nộp</strong>
              <p>Hoàn thành biểu mẫu để gửi bài làm.</p>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}

function SubmissionPreview({ submission }: { submission: SubmissionSummary }) {
  return (
    <div className="assignment-submission-preview">
      <p>
        Đã nộp lúc {new Date(submission.submittedAt).toLocaleString("vi-VN")}
        {submission.isLate ? " · Nộp muộn" : ""}
      </p>
      {submission.content ? <blockquote>{submission.content}</blockquote> : null}
      {submission.fileUrl ? (
        <a href={submission.fileUrl} rel="noreferrer" target="_blank">
          <ExternalLink aria-hidden="true" />
          Mở tệp đã nộp
        </a>
      ) : null}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMimeTypes(types?: string[]): string {
  if (!types?.length) return "PDF, DOCX, ZIP, PNG, JPG";
  return types
    .map((type) => ({
      "application/pdf": "PDF",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
      "application/zip": "ZIP",
      "image/jpeg": "JPG",
      "image/png": "PNG",
    })[type] ?? type)
    .join(", ");
}
