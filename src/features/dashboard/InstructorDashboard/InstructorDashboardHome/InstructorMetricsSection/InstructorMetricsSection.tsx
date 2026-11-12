import { currentSystemLocale } from "../../../../platform/translate-system-message";
import { SystemText } from "../../../../platform/SystemText";
import { useSystemMessages } from '@/features/platform/SystemText';
import { BookOpen, ClipboardCheck, Radio, Users } from "lucide-react";
import type { InstructorDashboardData } from "../../../../../services/dashboard.service";
import "./InstructorMetricsSection.css";

export function InstructorMetricsSection({
  statistics,
}: {
  statistics: InstructorDashboardData["statistics"];
}) {
  const messageForUi = useSystemMessages();
  const metrics = [
    {
      label: "Khóa học đã xuất bản",
      value: statistics.publishedCourses,
      icon: BookOpen,
      tone: "blue",
    },
    {
      label: "Học viên đang học",
      value: statistics.activeStudents,
      icon: Users,
      tone: "green",
    },
    {
      label: "Bài cần chấm",
      value: statistics.pendingSubmissions,
      icon: ClipboardCheck,
      tone: "amber",
    },
    {
      label: "Lớp sắp tới",
      value: statistics.upcomingSessions,
      icon: Radio,
      tone: "purple",
    },
  ];
  return (
    <section className="instructor-home-metrics" aria-label={messageForUi("Chỉ số giảng viên")}>
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
              <strong>{new Intl.NumberFormat(currentSystemLocale()).format(metric.value)}</strong>
              <p><SystemText message={metric.label} /></p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
