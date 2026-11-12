import { SystemValue } from '@/features/platform/SystemText';
import { currentSystemLocale } from "../../../../platform/translate-system-message";
import { SystemText } from '@/features/platform/SystemText';
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
        <h2><SystemText message={"Tiến độ học tập"} /></h2>
      </div>
      {statistics ? (
        <div className="student-profile-progress__stats">
          <article>
            <span><SystemText message={"Thời gian đã học"} /></span>
            <strong><SystemValue render={() => (formatLearningMinutes(statistics.completedMinutes))} /></strong>
          </article>
          <article>
            <span><SystemText message={"Khóa hoàn thành"} /></span>
            <strong>{statistics.completedCourses}</strong>
          </article>
          <article>
            <span><SystemText message={"Bài đã hoàn thành"} /></span>
            <strong>{statistics.completedLessons}</strong>
          </article>
          <article>
            <span><SystemText message={"Điểm quiz trung bình"} /></span>
            <strong>
              {statistics.averageQuizScore === null
                ? <SystemText message={"Chưa có"} />
                : `${new Intl.NumberFormat(currentSystemLocale(), {
                    maximumFractionDigits: 1,
                  }).format(statistics.averageQuizScore)}%`}
            </strong>
          </article>
        </div>
      ) : (
        <p className="student-profile-empty" role="status">
          <SystemText message={"Chưa có dữ liệu tiến độ."} />
        </p>
      )}
    </section>
  );
}
