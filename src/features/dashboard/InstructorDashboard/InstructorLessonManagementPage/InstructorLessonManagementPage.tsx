import { SystemText, useSystemMessages } from "../../../platform/SystemText";
import { ArrowLeft, BookOpen, FileText, Loader2, Pencil, Plus, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  courseService,
  getCourseErrorMessage,
  type LessonDetail,
  type LessonMutationInput,
  type LessonSummary,
  type LessonType,
} from "../../../../services/course.service";
import { LessonManagementForm } from "./LessonManagementForm/LessonManagementForm";
import "./InstructorLessonManagementPage.css";

const lessonTypeLabels: Record<LessonType, string> = {
  article: "Bài viết",
  pdf: "PDF",
  video: "Video",
};

const lessonTypeIcons: Record<LessonType, typeof FileText> = {
  article: FileText,
  pdf: BookOpen,
  video: Video,
};

interface InstructorLessonManagementPageProps {
  courseId: string;
}

export function InstructorLessonManagementPage({ courseId }: InstructorLessonManagementPageProps) {
  const messageForUi = useSystemMessages();
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [editingLesson, setEditingLesson] = useState<LessonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mutatingLessonId, setMutatingLessonId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const loadLessons = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await courseService.listInstructorLessons(courseId);
      setLessons(response);
    } catch (loadError) {
      setLessons([]);
      setError(getCourseErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  const metrics = useMemo(
    () => ({
      preview: lessons.filter((lesson) => lesson.isPreview).length,
      total: lessons.length,
      videos: lessons.filter((lesson) => lesson.type === "video").length,
    }),
    [lessons],
  );

  function openCreateForm() {
    setEditingLesson(null);
    setFormError(null);
    setMutationError(null);
    setIsFormOpen(true);
  }

  async function openEditForm(lesson: LessonSummary) {
    setFormError(null);
    setMutationError(null);
    setMutatingLessonId(lesson.id);

    try {
      setEditingLesson(await courseService.getLesson(lesson.id));
      setIsFormOpen(true);
    } catch (loadError) {
      setMutationError(getCourseErrorMessage(loadError));
    } finally {
      setMutatingLessonId(null);
    }
  }

  function closeForm() {
    setEditingLesson(null);
    setFormError(null);
    setIsFormOpen(false);
  }

  async function saveLesson(input: LessonMutationInput) {
    setIsSaving(true);
    setFormError(null);

    try {
      if (editingLesson) {
        await courseService.updateLesson(editingLesson.id, input);
      } else {
        await courseService.createLesson(courseId, input);
      }

      closeForm();
      await loadLessons();
    } catch (saveError) {
      setFormError(getCourseErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteLesson(lesson: LessonSummary) {
    const confirmed = window.confirm(`Xóa bài học "${lesson.title}"?`);
    if (!confirmed) return;

    setMutatingLessonId(lesson.id);
    setMutationError(null);

    try {
      await courseService.deleteLesson(lesson.id);
      await loadLessons();
    } catch (deleteError) {
      setMutationError(getCourseErrorMessage(deleteError));
    } finally {
      setMutatingLessonId(null);
    }
  }

  return (
    <div className="instructor-lesson-management">
      <header className="lesson-management-header">
        <div>
          <Link className="lesson-management-header__back" to="/instructor/dashboard/courses">
            <ArrowLeft aria-hidden="true" />
            <SystemText message={"Quay lại khóa học"} />
          </Link>
          <span><SystemText message={"Quản lý nội dung học"} /></span>
          <h1><SystemText message="Bài học của khóa học" /></h1>
          <p><SystemText message={"Sắp xếp thứ tự, tạo bài mới và cập nhật nội dung học cho khóa học đã chọn."} /></p>
        </div>
        <button className="lesson-management-header__create" onClick={openCreateForm} type="button">
          <Plus aria-hidden="true" />
          <SystemText message={"Tạo bài học"} />
        </button>
      </header>

      <section className="lesson-management-metrics" aria-label={messageForUi("Thống kê bài học")}>
        <Metric label={messageForUi("Tổng bài học")} value={metrics.total} />
        <Metric label={messageForUi("Bài video")} value={metrics.videos} />
        <Metric label={messageForUi("Cho học thử")} value={metrics.preview} />
      </section>

      {isFormOpen ? (
        <LessonManagementForm
          courseId={courseId}
          error={formError}
          isSaving={isSaving}
          lesson={editingLesson}
          onCancel={closeForm}
          onSubmit={saveLesson}
        />
      ) : null}

      {mutationError ? (
        <p className="lesson-management-alert" role="alert">
          <SystemText message={mutationError} />
        </p>
      ) : null}

      <section className="lesson-management-list" aria-labelledby="lesson-list-title">
        <header className="lesson-management-list__header">
          <div>
            <span><SystemText message={"Giáo trình"} /></span>
            <h2 id="lesson-list-title"><SystemText message={"Danh sách bài học"} /></h2>
          </div>
          <p>{lessons.length} <SystemText message={"bài học"} /></p>
        </header>

        {isLoading ? <LessonState icon={Loader2} loading message="Đang tải bài học..." /> : null}
        {!isLoading && error ? <LessonState icon={BookOpen} message={error} tone="error" /> : null}
        {!isLoading && !error && lessons.length === 0 ? (
          <LessonState icon={BookOpen} message="Chưa có bài học nào trong khóa học này." />
        ) : null}

        {!isLoading && !error && lessons.length > 0 ? (
          <ol className="lesson-management-list__items">
            {lessons.map((lesson) => {
              const LessonIcon = lessonTypeIcons[lesson.type];

              return (
                <li className="lesson-management-item" key={lesson.id}>
                  <span className="lesson-management-item__order">{lesson.orderIndex}</span>
                  <span className="lesson-management-item__type">
                    <LessonIcon aria-hidden="true" />
                  </span>
                  <div className="lesson-management-item__content">
                    <h3>{lesson.title}</h3>
                    <p>
                      <SystemText message={lessonTypeLabels[lesson.type]} />
                      {lesson.durationMinutes ? ` • ${lesson.durationMinutes}${messageForUi(" phút")}` : ""}
                      {lesson.isPreview ? <SystemText message={" • Học thử"} /> : ""}
                    </p>
                  </div>
                  <div className="lesson-management-item__actions">
                    <button
                      aria-label={`${messageForUi("Chỉnh sửa bài học ")}${lesson.title}`}
                      disabled={mutatingLessonId === lesson.id}
                      onClick={() => void openEditForm(lesson)}
                      type="button"
                    >
                      <Pencil aria-hidden="true" /><SystemText message="Sửa" /></button>
                    <button
                      aria-label={`${messageForUi("Xóa bài học ")}${lesson.title}`}
                      disabled={mutatingLessonId === lesson.id}
                      onClick={() => void deleteLesson(lesson)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" /><SystemText message="Xóa" /></button>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="lesson-management-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function LessonState({
  icon: Icon,
  loading = false,
  message,
  tone = "neutral",
}: {
  icon: typeof BookOpen;
  loading?: boolean;
  message: string;
  tone?: "error" | "neutral";
}) {
  return (
    <div className={`lesson-management-state lesson-management-state--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon aria-hidden="true" className={loading ? "is-spinning" : undefined} />
      <p>{message}</p>
    </div>
  );
}
