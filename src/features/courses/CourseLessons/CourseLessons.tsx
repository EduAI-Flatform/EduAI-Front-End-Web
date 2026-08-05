import { BookOpen, ClipboardList, FileText, LockKeyhole, PlayCircle } from "lucide-react";
import type { AssignmentSummary } from "../../../services/assignment.service";
import type { LessonSummary, LessonType } from "../../../services/course.service";
import { lessonTypeLabels } from "../course-display";
import "./CourseLessons.css";

export type CourseDetailTab = "overview" | "lessons" | "assignments" | "reviews";

interface CourseLessonsProps {
  activeTab: CourseDetailTab;
  assignments: AssignmentSummary[];
  courseDescription: string | null;
  isEnrolled: boolean;
  lessons: LessonSummary[];
  onLessonSelect: (lesson: LessonSummary) => void;
  onTabChange: (tab: CourseDetailTab) => void;
}

const lessonTypeIcons: Record<LessonType, typeof PlayCircle> = {
  video: PlayCircle,
  pdf: FileText,
  article: BookOpen,
};

const tabs: Array<{ id: CourseDetailTab; label: string }> = [
  { id: "overview", label: "Tổng quan" },
  { id: "lessons", label: "Bài học" },
  { id: "assignments", label: "Bài tập" },
  { id: "reviews", label: "Đánh giá" },
];

export function CourseLessons({
  activeTab,
  assignments,
  courseDescription,
  isEnrolled,
  lessons,
  onLessonSelect,
  onTabChange,
}: CourseLessonsProps) {
  return (
    <section className="course-detail-lessons" aria-label="Nội dung khóa học">
      <nav className="course-detail-tabs" aria-label="Nội dung khóa học">
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "course-detail-tabs__active" : undefined}
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <section className="course-detail-tab-panel" role="tabpanel">
          <h2>Về khóa học</h2>
          <p>{courseDescription ?? "Khóa học chưa có mô tả chi tiết."}</p>
        </section>
      ) : null}

      {activeTab === "lessons" ? (
        <ol className="course-lessons" role="tabpanel">
          {lessons.length > 0 ? (
            lessons.map((lesson) => {
              const LessonIcon = lessonTypeIcons[lesson.type];
              const canOpen = isEnrolled || lesson.isPreview;
              return (
                <li className="course-lesson" id={`course-lesson-${lesson.id}`} key={lesson.id}>
                  <button
                    aria-disabled={!canOpen}
                    className="course-lesson__button"
                    disabled={!canOpen}
                    onClick={() => onLessonSelect(lesson)}
                    type="button"
                  >
                    <span className="course-lesson__summary">
                      <span className="course-lesson__order">{lesson.orderIndex}</span>
                      <span>
                        <strong>{lesson.title}</strong>
                        <small>
                          {lessonTypeLabels[lesson.type]}
                          {lesson.durationMinutes ? ` • ${lesson.durationMinutes} phút` : ""}
                          {lesson.isPreview ? " • Học thử" : ""}
                        </small>
                      </span>
                    </span>
                    <span className="course-lesson__icon">
                      {canOpen ? <LessonIcon aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
                    </span>
                  </button>
                </li>
              );
            })
          ) : (
            <li className="course-detail-empty" role="status">Chưa có bài học công khai cho khóa học này.</li>
          )}
        </ol>
      ) : null}

      {activeTab === "assignments" ? (
        <section className="course-detail-tab-panel" role="tabpanel">
          <h2>Bài tập</h2>
          {assignments.length > 0 ? (
            <ul className="course-detail-resource-list">
              {assignments.map((assignment) => (
                <li key={assignment.id}>
                  <ClipboardList aria-hidden="true" />
                  <span>
                    <strong>{assignment.title}</strong>
                    <small>{assignment.description ?? "Bài tập thực hành của khóa học."}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Chưa có bài tập khả dụng. Hãy đăng ký khóa học để xem nội dung học tập.</p>
          )}
        </section>
      ) : null}

      {activeTab === "reviews" ? (
        <section className="course-detail-tab-panel" role="tabpanel">
          <h2>Đánh giá khóa học</h2>
          <p>Điểm đánh giá: Chưa có dữ liệu đánh giá chi tiết.</p>
        </section>
      ) : null}
    </section>
  );
}
