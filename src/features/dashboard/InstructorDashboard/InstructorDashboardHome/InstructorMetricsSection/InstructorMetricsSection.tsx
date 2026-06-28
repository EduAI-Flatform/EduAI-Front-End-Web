import { BookOpen, ClipboardCheck, Radio, Users } from "lucide-react";
import "./InstructorMetricsSection.css";

const metrics = [
  { label: "Khóa học hoạt động", value: "12", icon: BookOpen, tone: "blue" },
  { label: "Học viên đang học", value: "1.284", icon: Users, tone: "green" },
  { label: "Bài cần chấm", value: "26", icon: ClipboardCheck, tone: "amber" },
  { label: "Lớp trực tuyến", value: "3", icon: Radio, tone: "purple" },
];

export function InstructorMetricsSection() {
  return (
    <section className="instructor-home-metrics" aria-label="Chỉ số giảng viên">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <article
            className={`instructor-home-metric instructor-home-metric--${metric.tone}`}
            key={metric.label}
          >
            <span>
              <Icon aria-hidden="true" />
            </span>
            <div>
              <strong>{metric.value}</strong>
              <p>{metric.label}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
