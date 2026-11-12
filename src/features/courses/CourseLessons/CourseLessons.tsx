import { SystemText, useSystemMessages } from "../../platform/SystemText";
import { BookOpen, ClipboardList, FileText, LockKeyhole, PlayCircle } from "lucide-react";
import type { AssignmentSummary } from "../../../services/assignment.service";
import type { LessonSummary, LessonType } from "../../../services/course.service";
import { lessonTypeLabels } from "../course-display";
import "./CourseLessons.css";
import { RichDescription } from "../../../components/content/RichDescription";

export type CourseDetailTab = "overview" | "lessons" | "assignments" | "reviews";

interface CourseLessonsProps {
  activeTab: CourseDetailTab;
  assignments: AssignmentSummary[];
  courseDescription: string | null;
  isEnrolled: boolean;
  lessons: LessonSummary[];
  onLessonSelect: (lesson: LessonSummary) => void;
  onAssignmentSelect?: (assignment: AssignmentSummary) => void;
  onTabChange: (tab: CourseDetailTab) => void;
  ratingAverage?: number | null;
  ratingCount?: number;
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
  onAssignmentSelect,
  onTabChange,
  ratingAverage,
  ratingCount = 0,
}: CourseLessonsProps) {
  const messageForUi = useSystemMessages();
  return (
    <section className="course-detail-lessons" aria-label={messageForUi("Nội dung khóa học")}>
      <nav className="course-detail-tabs" aria-label={messageForUi("Nội dung khóa học")}>
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "course-detail-tabs__active" : undefined}
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            type="button"
          >
            <SystemText message={tab.label} />
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <section className="course-detail-tab-panel" role="tabpanel">
          <h2><SystemText message={"Về khóa học"} /></h2>
          <RichDescription value={courseDescription ?? "Khóa học chưa có mô tả chi tiết."} />
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
                          <SystemText message={lessonTypeLabels[lesson.type]} />
                          {lesson.durationMinutes ? ` • ${lesson.durationMinutes}${messageForUi(" phút")}` : ""}
                          {lesson.isPreview ? <SystemText message={" • Học thử"} /> : ""}
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
            <li className="course-detail-empty" role="status"><SystemText message="Chưa có bài học công khai cho khóa học này." /></li>
          )}
        </ol>
      ) : null}

      {activeTab === "assignments" ? (
        <section className="course-detail-tab-panel" role="tabpanel">
          <h2><SystemText message="Bài tập" /></h2>
          {assignments.length > 0 ? (
            <ul className="course-detail-resource-list">
              {assignments.map((assignment) => (
                <li key={assignment.id}>
                  <ClipboardList aria-hidden="true" />
                  <button onClick={() => onAssignmentSelect?.(assignment)} type="button">
                    <strong>{assignment.title}</strong>
                    <small>{assignment.description ?? <SystemText message={"Bài tập thực hành của khóa học."} />}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p><SystemText message={"Chưa có bài tập khả dụng. Hãy đăng ký khóa học để xem nội dung học tập."} /></p>
          )}
        </section>
      ) : null}

      {activeTab === "reviews" ? (
        <section className="course-detail-tab-panel" role="tabpanel">
          <h2><SystemText message={"Đánh giá khóa học"} /></h2>
          <p>
            {ratingAverage === null || ratingAverage === undefined
              ? <SystemText message={"Chưa có đánh giá cho khóa học này."} />
              : `${ratingAverage.toFixed(1)}/5 (${ratingCount}${messageForUi(" đánh giá)")}`}
          </p>
        </section>
      ) : null}
    </section>
  );
}
