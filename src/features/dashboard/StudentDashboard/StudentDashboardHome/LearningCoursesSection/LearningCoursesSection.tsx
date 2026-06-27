import { BookOpenCheck, CalendarClock, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { learningCourses } from "../dashboardHomeData";
import "./LearningCoursesSection.css";

export function LearningCoursesSection() {
  return (
    <section className="student-dashboard__section">
      <div className="student-dashboard__section-header">
        <h2>Khóa học đang học</h2>
        <Link to="/learning">Xem tất cả</Link>
      </div>

      <div className="student-dashboard__course-row">
        {learningCourses.map((course) => (
          <article className="student-dashboard__course-card" key={course.title}>
            <div className="student-dashboard__course-media">
              {course.image ? (
                <img alt={`Ảnh khóa học ${course.title}`} src={course.image} />
              ) : (
                <div className="student-dashboard__course-placeholder">
                  <BookOpenCheck aria-hidden="true" />
                  <span>Bắt đầu khóa học mới</span>
                </div>
              )}
              <span className="student-dashboard__course-badge">{course.badge}</span>
            </div>
            <div className="student-dashboard__course-body">
              <h3>{course.title}</h3>
              <div className="student-dashboard__course-progress-label">
                <span>Tiến độ</span>
                <span>{course.progress}%</span>
              </div>
              <div className="student-dashboard__course-progress">
                <span style={{ width: `${course.progress}%` }} />
              </div>
              <div className="student-dashboard__course-meta">
                <span>
                  <PlayCircle aria-hidden="true" />
                  {course.lessons}
                </span>
                <span>
                  <CalendarClock aria-hidden="true" />
                  {course.remaining}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
