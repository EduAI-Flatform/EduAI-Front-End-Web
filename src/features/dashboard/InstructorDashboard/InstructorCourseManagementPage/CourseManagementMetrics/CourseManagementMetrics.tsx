import { Archive, BookOpen, CheckCircle2, FileText } from "lucide-react";
import "./CourseManagementMetrics.css";

interface CourseManagementMetricsProps {
  counts: { archived: number; draft: number; published: number };
  total: number;
}

export function CourseManagementMetrics({ counts, total }: CourseManagementMetricsProps) {
  const metrics = [
    { icon: BookOpen, label: "Tổng khóa học", tone: "primary", value: total },
    { icon: CheckCircle2, label: "Đã xuất bản trong trang", tone: "success", value: counts.published },
    { icon: FileText, label: "Bản nháp trong trang", tone: "warning", value: counts.draft },
    { icon: Archive, label: "Đã lưu trữ trong trang", tone: "neutral", value: counts.archived },
  ];

  return (
    <section className="course-management-metrics" aria-label="Tổng quan khóa học">
      {metrics.map(({ icon: Icon, label, tone, value }) => (
        <article className={`course-management-metric course-management-metric--${tone}`} key={label}>
          <span><Icon aria-hidden="true" /></span>
          <div>
            <strong>{value}</strong>
            <p>{label}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
