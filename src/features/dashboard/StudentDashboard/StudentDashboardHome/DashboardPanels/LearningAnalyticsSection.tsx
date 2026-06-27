import { analyticsBars, analyticsStats } from "../dashboardHomeData";
import "./LearningAnalyticsSection.css";

export function LearningAnalyticsSection() {
  return (
    <section className="student-dashboard__panel student-dashboard__analytics">
      <div className="student-dashboard__analytics-header">
        <div>
          <h2>Phân tích học tập</h2>
          <p>Hoạt động của bạn trong 7 ngày qua</p>
        </div>
        <div className="student-dashboard__segmented">
          <button className="student-dashboard__segmented-active" type="button">
            Tuần
          </button>
          <button type="button">Tháng</button>
        </div>
      </div>

      <div className="student-dashboard__chart" aria-label="Biểu đồ thời gian học">
        {analyticsBars.map((bar) => (
          <div className="student-dashboard__bar" key={bar.label}>
            <span
              className={bar.active ? "student-dashboard__bar-fill--active" : ""}
              style={{ height: `${bar.value}%` }}
            />
            <p>{bar.label}</p>
          </div>
        ))}
      </div>

      <div className="student-dashboard__analytics-stats">
        {analyticsStats.map((stat) => (
          <article key={stat.label}>
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
