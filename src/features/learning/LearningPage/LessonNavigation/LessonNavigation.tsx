import { BookOpen, CheckCircle2, FileText, PlayCircle } from "lucide-react";
import type {
  LessonSummary,
  LessonType,
} from "../../../../services/course.service";
import "./LessonNavigation.css";

interface LessonNavigationProps {
  completedLessonIds: Set<string>;
  lessons: LessonSummary[];
  selectedLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
}

const lessonIcons: Record<LessonType, typeof PlayCircle> = {
  video: PlayCircle,
  pdf: FileText,
  article: BookOpen,
};

export function LessonNavigation({
  completedLessonIds,
  lessons,
  selectedLessonId,
  onSelectLesson,
}: LessonNavigationProps) {
  return (
    <section className="lesson-navigation">
      <div className="lesson-navigation__header">
        <span>Lộ trình</span>
        <h2>Danh sách bài học</h2>
      </div>

      {lessons.length > 0 ? (
        <ol className="lesson-navigation__list">
          {lessons.map((lesson) => {
            const LessonIcon = lessonIcons[lesson.type];
            const isSelected = lesson.id === selectedLessonId;
            const isComplete = completedLessonIds.has(lesson.id);

            return (
              <li key={lesson.id}>
                <button
                  aria-current={isSelected ? "step" : undefined}
                  className={isSelected ? "lesson-navigation__item--active" : undefined}
                  onClick={() => onSelectLesson(lesson.id)}
                  type="button"
                >
                  <span className="lesson-navigation__icon">
                    {isComplete ? (
                      <CheckCircle2 aria-hidden="true" />
                    ) : (
                      <LessonIcon aria-hidden="true" />
                    )}
                  </span>
                  <span className="lesson-navigation__copy">
                    <strong>{lesson.title}</strong>
                    <small>
                      Bài {lesson.orderIndex}
                      {lesson.durationMinutes ? ` · ${lesson.durationMinutes} phút` : ""}
                    </small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="lesson-navigation__empty">Chưa có bài học công khai.</p>
      )}
    </section>
  );
}
