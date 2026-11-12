import { currentSystemLocale } from "../../../../platform/translate-system-message";
import { SystemText, useSystemMessages } from '@/features/platform/SystemText';
import {
  formatLearningMinutes,
  getWeeklyActivityBars,
  type StudentDashboardStatistics,
  type WeeklyCompletedMinutes,
} from "../../../../../services/dashboard.service";
import "./LearningAnalyticsSection.css";

export function LearningAnalyticsSection({
  statistics,
  weeklyMinutes,
}: {
  statistics: StudentDashboardStatistics;
  weeklyMinutes: WeeklyCompletedMinutes[];
}) {
  const messageForUi = useSystemMessages();
  const analyticsBars = getWeeklyActivityBars(weeklyMinutes);
  const analyticsStats = [
    {
      label: "Thời gian học",
      value: formatLearningMinutes(statistics.completedMinutes),
    },
    { label: "Hoàn thành", value: `${statistics.completedCourses} khóa` },
    {
      label: "Điểm quiz trung bình",
      value:
        statistics.averageQuizScore === null
          ? "Chưa có"
          : `${new Intl.NumberFormat(currentSystemLocale(), {
              maximumFractionDigits: 1,
            }).format(statistics.averageQuizScore)}%`,
    },
    { label: "Bài đã học", value: String(statistics.completedLessons) },
  ];
  return (
    <section className="student-dashboard__panel student-dashboard__analytics">
      <div className="student-dashboard__analytics-header">
        <div>
          <h2><SystemText message={"Phân tích học tập"} /></h2>
          <p><SystemText message={"Hoạt động của bạn trong 7 ngày qua"} /></p>
        </div>
        <div className="student-dashboard__segmented">
          <button className="student-dashboard__segmented-active" type="button">
            <SystemText message={"Tuần"} />
          </button>
          <button type="button"><SystemText message={"Tháng"} /></button>
        </div>
      </div>

      <div className="student-dashboard__chart" aria-label={messageForUi("Biểu đồ thời gian học")}>
        {analyticsBars.map((bar) => (
          <div className="student-dashboard__bar" key={bar.label}>
            <span
              aria-label={`${bar.minutes}${messageForUi(" phút")}`}
              style={{ height: `${bar.value}%` }}
            />
            <p>{bar.label}</p>
          </div>
        ))}
      </div>

      <div className="student-dashboard__analytics-stats">
        {analyticsStats.map((stat) => (
          <article key={stat.label}>
            <p><SystemText message={stat.label} /></p>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
