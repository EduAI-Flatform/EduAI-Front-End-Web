import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Plus,
  Send,
  Star,
  Upload,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  assignmentService,
  getAssignmentErrorMessage,
  type AssignmentMutationInput,
  type AssignmentStatus,
  type AssignmentSummary,
  type SubmissionSummary,
} from "../../../../services/assignment.service";
import "./InstructorAssignmentManagementPage.css";

const statusLabels: Record<AssignmentStatus, string> = {
  archived: "Đã lưu trữ",
  draft: "Bản nháp",
  published: "Đã xuất bản",
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function InstructorAssignmentManagementPage({ courseId }: { courseId: string }) {
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [mutatingAssignmentId, setMutatingAssignmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId],
  );

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedAssignments = await assignmentService.listCourseAssignments(courseId);
      setAssignments(loadedAssignments);
      setSelectedAssignmentId((current) => current ?? loadedAssignments[0]?.id ?? null);
    } catch (loadError) {
      setAssignments([]);
      setError(getAssignmentErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  const loadSubmissions = useCallback(async () => {
    if (!selectedAssignmentId) {
      setSubmissions([]);
      return;
    }

    try {
      setSubmissions(await assignmentService.listSubmissions(selectedAssignmentId));
    } catch (loadError) {
      setFormError(getAssignmentErrorMessage(loadError));
      setSubmissions([]);
    }
  }, [selectedAssignmentId]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  async function createAssignment(input: AssignmentMutationInput) {
    setIsSavingAssignment(true);
    setFormError(null);

    try {
      const created = await assignmentService.createAssignment(courseId, input);
      setAssignments((current) => [created, ...current]);
      setSelectedAssignmentId(created.id);
    } catch (saveError) {
      setFormError(getAssignmentErrorMessage(saveError));
    } finally {
      setIsSavingAssignment(false);
    }
  }

  async function publishAssignment(assignment: AssignmentSummary) {
    setMutatingAssignmentId(assignment.id);
    setFormError(null);

    try {
      const published = await assignmentService.publishAssignment(assignment.id);
      setAssignments((current) =>
        current.map((item) => (item.id === published.id ? published : item)),
      );
    } catch (publishError) {
      setFormError(getAssignmentErrorMessage(publishError));
    } finally {
      setMutatingAssignmentId(null);
    }
  }

  async function archiveAssignment(assignment: AssignmentSummary) {
    const confirmed = window.confirm(`Lưu trữ bài tập "${assignment.title}"?`);
    if (!confirmed) return;

    setMutatingAssignmentId(assignment.id);
    setFormError(null);

    try {
      await assignmentService.deleteAssignment(assignment.id);
      setAssignments((current) =>
        current.map((item) =>
          item.id === assignment.id ? { ...item, status: "archived" } : item,
        ),
      );
    } catch (archiveError) {
      setFormError(getAssignmentErrorMessage(archiveError));
    } finally {
      setMutatingAssignmentId(null);
    }
  }

  async function gradeSubmission(
    submission: SubmissionSummary,
    score: number,
    feedback: string | null,
  ) {
    setGradingSubmissionId(submission.id);
    setFormError(null);

    try {
      const graded = await assignmentService.gradeSubmission(submission.id, {
        feedback,
        score,
      });
      setSubmissions((current) =>
        current.map((item) => (item.id === graded.id ? graded : item)),
      );
    } catch (gradeError) {
      setFormError(getAssignmentErrorMessage(gradeError));
    } finally {
      setGradingSubmissionId(null);
    }
  }

  return (
    <div className="instructor-assignment-management">
      <header className="assignment-management-header">
        <div>
          <span>Đánh giá tự luận</span>
          <h1>Quản lý bài tập</h1>
          <p>Tạo bài tập, xuất bản cho học viên và chấm điểm bài nộp.</p>
        </div>
      </header>

      {formError ? (
        <p className="assignment-management-alert" role="alert">
          {formError}
        </p>
      ) : null}

      <section className="assignment-management-layout">
        <div className="assignment-management-main">
          <AssignmentCreateForm isSaving={isSavingAssignment} onSubmit={createAssignment} />

          <section className="assignment-management-list" aria-labelledby="assignment-list-title">
            <header>
              <div>
                <span>Danh sách</span>
                <h2 id="assignment-list-title">Bài tập khóa học</h2>
              </div>
              <strong>{assignments.length} bài tập</strong>
            </header>

            {isLoading ? (
              <AssignmentState icon={Loader2} loading message="Đang tải bài tập..." />
            ) : null}
            {!isLoading && error ? (
              <AssignmentState icon={AlertCircle} message={error} tone="error" />
            ) : null}
            {!isLoading && !error && assignments.length === 0 ? (
              <AssignmentState icon={ClipboardCheck} message="Chưa có bài tập nào." />
            ) : null}

            {!isLoading && !error && assignments.length > 0 ? (
              <div className="assignment-management-items">
                {assignments.map((assignment) => (
                  <article
                    className={
                      selectedAssignmentId === assignment.id
                        ? "assignment-management-item assignment-management-item--active"
                        : "assignment-management-item"
                    }
                    key={assignment.id}
                  >
                    <button onClick={() => setSelectedAssignmentId(assignment.id)} type="button">
                      <span className={`assignment-management-item__status assignment-management-item__status--${assignment.status}`}>
                        {statusLabels[assignment.status]}
                      </span>
                      <strong>{assignment.title}</strong>
                      <small>
                        {assignment.maxScore} điểm · {assignment.dueDate ? dateFormatter.format(new Date(assignment.dueDate)) : "Không hạn nộp"}
                      </small>
                    </button>
                    <div>
                      {assignment.status !== "published" ? (
                        <button
                          disabled={mutatingAssignmentId === assignment.id}
                          onClick={() => void publishAssignment(assignment)}
                          type="button"
                        >
                          <Upload aria-hidden="true" />
                          Xuất bản
                        </button>
                      ) : null}
                      {assignment.status !== "archived" ? (
                        <button
                          disabled={mutatingAssignmentId === assignment.id}
                          onClick={() => void archiveAssignment(assignment)}
                          type="button"
                        >
                          <Archive aria-hidden="true" />
                          Lưu trữ
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="assignment-submission-panel" aria-label="Bài nộp">
          {selectedAssignment ? (
            <>
              <header>
                <span>Bài nộp</span>
                <h2>{selectedAssignment.title}</h2>
                <p>{submissions.length} lượt nộp</p>
              </header>
              {submissions.length > 0 ? (
                <ol className="assignment-submission-list">
                  {submissions.map((submission) => (
                    <li key={submission.id}>
                      <SubmissionGradeForm
                        assignment={selectedAssignment}
                        isSaving={gradingSubmissionId === submission.id}
                        onSubmit={(score, feedback) =>
                          gradeSubmission(submission, score, feedback)
                        }
                        submission={submission}
                      />
                    </li>
                  ))}
                </ol>
              ) : (
                <AssignmentState icon={ClipboardCheck} message="Chưa có bài nộp." />
              )}
            </>
          ) : (
            <AssignmentState icon={ClipboardCheck} message="Chọn hoặc tạo bài tập để xem bài nộp." />
          )}
        </aside>
      </section>
    </div>
  );
}

function AssignmentCreateForm({
  isSaving,
  onSubmit,
}: {
  isSaving: boolean;
  onSubmit: (input: AssignmentMutationInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState("10");
  const [error, setError] = useState<string | null>(null);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: AssignmentMutationInput = {
      description: description.trim() || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      maxScore: Number(maxScore),
      title: title.trim(),
    };
    const validationError = validateAssignmentInput(input);

    setError(validationError);
    if (validationError) return;

    await onSubmit(input);
    setTitle("");
    setDescription("");
    setDueDate("");
  }

  return (
    <section className="assignment-create-form" aria-labelledby="assignment-create-title">
      <header>
        <Plus aria-hidden="true" />
        <h2 id="assignment-create-title">Tạo bài tập</h2>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      <form onSubmit={submitForm}>
        <label>
          <span>Tiêu đề</span>
          <input onChange={(event) => setTitle(event.target.value)} value={title} />
        </label>
        <label>
          <span>Mô tả</span>
          <textarea onChange={(event) => setDescription(event.target.value)} rows={4} value={description} />
        </label>
        <div className="assignment-create-form__grid">
          <label>
            <span>Hạn nộp</span>
            <input onChange={(event) => setDueDate(event.target.value)} type="datetime-local" value={dueDate} />
          </label>
          <label>
            <span>Điểm tối đa</span>
            <input min="0.01" onChange={(event) => setMaxScore(event.target.value)} step="0.01" type="number" value={maxScore} />
          </label>
        </div>
        <button disabled={isSaving} type="submit">
          {isSaving ? <Loader2 aria-hidden="true" className="is-spinning" /> : <Plus aria-hidden="true" />}
          {isSaving ? "Đang tạo..." : "Tạo bài tập"}
        </button>
      </form>
    </section>
  );
}

function SubmissionGradeForm({
  assignment,
  isSaving,
  onSubmit,
  submission,
}: {
  assignment: AssignmentSummary;
  isSaving: boolean;
  onSubmit: (score: number, feedback: string | null) => void;
  submission: SubmissionSummary;
}) {
  const [score, setScore] = useState(
    submission.score === null ? "" : String(submission.score),
  );
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [error, setError] = useState<string | null>(null);

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericScore = Number(score);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > assignment.maxScore) {
      setError(`Điểm phải từ 0 đến ${assignment.maxScore}.`);
      return;
    }
    setError(null);
    onSubmit(numericScore, feedback.trim() || null);
  }

  return (
    <article className="submission-grade-card">
      <header>
        <div>
          <span>{submission.isLate ? "Nộp muộn" : "Đúng hạn"}</span>
          <strong>{submission.student.fullName}</strong>
          <small>{new Date(submission.submittedAt).toLocaleString("vi-VN")}</small>
        </div>
        {submission.status === "graded" ? <CheckCircle2 aria-hidden="true" /> : <Star aria-hidden="true" />}
      </header>
      {submission.content ? <blockquote>{submission.content}</blockquote> : null}
      {submission.fileUrl ? (
        <a href={submission.fileUrl} rel="noreferrer" target="_blank">
          Mở tệp bài làm
        </a>
      ) : null}
      <form onSubmit={submitForm}>
        <label>
          <span>Điểm</span>
          <input
            max={assignment.maxScore}
            min="0"
            onChange={(event) => setScore(event.target.value)}
            step="0.01"
            type="number"
            value={score}
          />
        </label>
        <label>
          <span>Nhận xét</span>
          <textarea onChange={(event) => setFeedback(event.target.value)} rows={3} value={feedback} />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button disabled={isSaving} type="submit">
          {isSaving ? <Loader2 aria-hidden="true" className="is-spinning" /> : <Send aria-hidden="true" />}
          {isSaving ? "Đang lưu..." : "Lưu điểm"}
        </button>
      </form>
    </article>
  );
}

function AssignmentState({
  icon: Icon,
  loading = false,
  message,
  tone = "neutral",
}: {
  icon: typeof ClipboardCheck;
  loading?: boolean;
  message: string;
  tone?: "error" | "neutral";
}) {
  return (
    <div className={`assignment-management-state assignment-management-state--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon aria-hidden="true" className={loading ? "is-spinning" : undefined} />
      <p>{message}</p>
    </div>
  );
}

function validateAssignmentInput(input: AssignmentMutationInput): string | null {
  if (!input.title) return "Vui lòng nhập tiêu đề bài tập.";
  if (!Number.isFinite(input.maxScore) || input.maxScore <= 0) {
    return "Điểm tối đa phải lớn hơn 0.";
  }
  return null;
}
