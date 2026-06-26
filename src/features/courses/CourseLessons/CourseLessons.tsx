import { BookOpen, FileText, PlayCircle } from "lucide-react";
import type { LessonSummary, LessonType } from "../../../services/course.service";
import { lessonTypeLabels } from "../course-display";
import "./CourseLessons.css";

const lessonTypeIcons: Record<LessonType, typeof PlayCircle> = {
  video: PlayCircle,
  pdf: FileText,
  article: BookOpen,
};

interface CourseLessonsProps {
  lessons: LessonSummary[];
}

export function CourseLessons({ lessons }: CourseLessonsProps) {
  return (
    <section className="course-detail-lessons">
      <nav className="course-detail-tabs" aria-label="Nội dung khóa học">
        <button type="button">Tổng quan</button>
        <button className="course-detail-tabs__active" type="button">
          Bài học
        </button>
        <button type="button">Bài tập</button>
        <button type="button">Đánh giá</button>
      </nav>

      {lessons.length > 0 ? (
        <ol className="course-lessons">
          {lessons.map((lesson) => {
            const LessonIcon = lessonTypeIcons[lesson.type];

            return (
              <li className="course-lesson" key={lesson.id}>
                <div className="course-lesson__summary">
                  <span className="course-lesson__order">{lesson.orderIndex}</span>
                  <div>
                    <h2>{lesson.title}</h2>
                    <p>
                      {lessonTypeLabels[lesson.type]}
                      {lesson.durationMinutes
                        ? ` • ${lesson.durationMinutes} phút`
                        : ""}
                      {lesson.isPreview ? " • Học thử" : ""}
                    </p>
                  </div>
                </div>
                <span className="course-lesson__icon">
                  <LessonIcon aria-hidden="true" />
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="course-detail-empty" role="status">
          Chưa có bài học công khai cho khóa học này.
        </div>
      )}
    </section>
  );
}
