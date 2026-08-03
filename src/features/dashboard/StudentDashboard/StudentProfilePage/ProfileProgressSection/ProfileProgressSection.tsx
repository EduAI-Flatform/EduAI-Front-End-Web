import {
  formatLearningMinutes,
  type StudentDashboardStatistics,
} from "../../../../../services/dashboard.service";
import "./ProfileProgressSection.css";

export function ProfileProgressSection({
  statistics,
}: {
  statistics: StudentDashboardStatistics | null;
}) {
  return (
    <section className="student-profile-card student-profile-progress">
      <div className="student-profile-card__header">
        <h2>Tiến độ học tập</h2>
      </div>
      {statistics ? (
        <div className="student-profile-progress__stats">
          <article>
            <span>Thời gian đã học</span>
            <strong>{formatLearningMinutes(statistics.completedMinutes)}</strong>
          </article>
          <article>
            <span>Khóa hoàn thành</span>
            <strong>{statistics.completedCourses}</strong>
          </article>
          <article>
            <span>Bài đã hoàn thành</span>
            <strong>{statistics.completedLessons}</strong>
          </article>
          <article>
            <span>Điểm quiz trung bình</span>
            <strong>
              {statistics.averageQuizScore === null
                ? "Chưa có"
                : `${new Intl.NumberFormat("vi-VN", {
                    maximumFractionDigits: 1,
                  }).format(statistics.averageQuizScore)}%`}
            </strong>
          </article>
        </div>
      ) : (
        <p className="student-profile-empty" role="status">
          Chưa có dữ liệu tiến độ.
        </p>
      )}
    </section>
  );
}
