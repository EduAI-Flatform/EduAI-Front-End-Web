import { ArrowLeft, BookOpen, FileText, Loader2, Pencil, Plus, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  courseService,
  getCourseErrorMessage,
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
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [editingLesson, setEditingLesson] = useState<LessonSummary | null>(null);
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

  function openEditForm(lesson: LessonSummary) {
    setEditingLesson(lesson);
    setFormError(null);
    setMutationError(null);
    setIsFormOpen(true);
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
            Quay lại khóa học
          </Link>
          <span>Quản lý nội dung học</span>
          <h1>Bài học của khóa học</h1>
          <p>Sắp xếp thứ tự, tạo bài mới và cập nhật nội dung học cho khóa học đã chọn.</p>
        </div>
        <button className="lesson-management-header__create" onClick={openCreateForm} type="button">
          <Plus aria-hidden="true" />
          Tạo bài học
        </button>
      </header>

      <section className="lesson-management-metrics" aria-label="Thống kê bài học">
        <Metric label="Tổng bài học" value={metrics.total} />
        <Metric label="Bài video" value={metrics.videos} />
        <Metric label="Cho học thử" value={metrics.preview} />
      </section>

      {isFormOpen ? (
        <LessonManagementForm
          error={formError}
          isSaving={isSaving}
          lesson={editingLesson}
          onCancel={closeForm}
          onSubmit={saveLesson}
        />
      ) : null}

      {mutationError ? (
        <p className="lesson-management-alert" role="alert">
          {mutationError}
        </p>
      ) : null}

      <section className="lesson-management-list" aria-labelledby="lesson-list-title">
        <header className="lesson-management-list__header">
          <div>
            <span>Giáo trình</span>
            <h2 id="lesson-list-title">Danh sách bài học</h2>
          </div>
          <p>{lessons.length} bài học</p>
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
                      {lessonTypeLabels[lesson.type]}
                      {lesson.durationMinutes ? ` • ${lesson.durationMinutes} phút` : ""}
                      {lesson.isPreview ? " • Học thử" : ""}
                    </p>
                  </div>
                  <div className="lesson-management-item__actions">
                    <button
                      aria-label={`Chỉnh sửa bài học ${lesson.title}`}
                      onClick={() => openEditForm(lesson)}
                      type="button"
                    >
                      <Pencil aria-hidden="true" />
                      Sửa
                    </button>
                    <button
                      aria-label={`Xóa bài học ${lesson.title}`}
                      disabled={mutatingLessonId === lesson.id}
                      onClick={() => void deleteLesson(lesson)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" />
                      Xóa
                    </button>
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
