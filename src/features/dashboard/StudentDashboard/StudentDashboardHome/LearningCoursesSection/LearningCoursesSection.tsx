import { BookOpenCheck, CalendarClock, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import {
  formatLearningMinutes,
  type StudentActiveCourse,
} from "../../../../../services/dashboard.service";
import "./LearningCoursesSection.css";

export function LearningCoursesSection({
  courses,
}: {
  courses: StudentActiveCourse[];
}) {
  return (
    <section className="student-dashboard__section">
      <div className="student-dashboard__section-header">
        <h2>Khóa học đang học</h2>
        <Link to="/dashboard/learning">Xem tất cả</Link>
      </div>

      {courses.length > 0 ? (
        <div className="student-dashboard__course-row">
        {courses.map((item) => (
          <article className="student-dashboard__course-card" key={item.enrollmentId}>
            <div className="student-dashboard__course-media">
              {item.course.thumbnailUrl ? (
                <img
                  alt={`Ảnh khóa học ${item.course.title}`}
                  src={item.course.thumbnailUrl}
                />
              ) : (
                <div className="student-dashboard__course-placeholder">
                  <BookOpenCheck aria-hidden="true" />
                  <span>Bắt đầu khóa học mới</span>
                </div>
              )}
              {item.course.badge ? (
                <span className="student-dashboard__course-badge">
                  {item.course.badge}
                </span>
              ) : null}
            </div>
            <div className="student-dashboard__course-body">
              <h3>{item.course.title}</h3>
              <div className="student-dashboard__course-progress-label">
                <span>Tiến độ</span>
                <span>{Math.round(item.progress.progressPercent)}%</span>
              </div>
              <div className="student-dashboard__course-progress">
                <span style={{ width: `${item.progress.progressPercent}%` }} />
              </div>
              <div className="student-dashboard__course-meta">
                <span>
                  <PlayCircle aria-hidden="true" />
                  {item.progress.completedLessons}/{item.progress.totalLessons} bài
                </span>
                <span>
                  <CalendarClock aria-hidden="true" />
                  {formatLearningMinutes(item.progress.remainingMinutes)} còn lại
                </span>
              </div>
              <Link to={`/learning/${item.course.id}`}>Tiếp tục học</Link>
            </div>
          </article>
        ))}
        </div>
      ) : (
        <p className="student-dashboard__section-empty" role="status">
          Bạn chưa ghi danh khóa học nào.
        </p>
      )}
    </section>
  );
}
