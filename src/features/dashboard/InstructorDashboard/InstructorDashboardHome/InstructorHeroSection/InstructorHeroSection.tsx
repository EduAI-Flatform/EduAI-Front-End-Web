import { CalendarDays, GraduationCap, TrendingUp } from "lucide-react";
import type { InstructorDashboardData } from "../../../../../services/dashboard.service";
import "./InstructorHeroSection.css";

interface InstructorHeroSectionProps {
  firstName: string;
  statistics: InstructorDashboardData["statistics"];
}

export function InstructorHeroSection({
  firstName,
  statistics,
}: InstructorHeroSectionProps) {
  return (
    <section className="instructor-home-hero">
      <div className="instructor-home-hero__content">
        <span className="instructor-home-hero__eyebrow">
          <GraduationCap aria-hidden="true" />
          Không gian giảng viên
        </span>
        <h1>Chào {firstName}, hôm nay lớp học đang chờ bạn.</h1>
        <p>
          Theo dõi tăng trưởng học viên, tiến độ khóa học và các việc cần xử lý
          trong một bảng điều khiển tập trung.
        </p>
      </div>

      <div className="instructor-home-hero__summary">
        <article>
          <CalendarDays aria-hidden="true" />
          <span>Lịch hôm nay</span>
          <strong>{statistics.todaySessions} phiên</strong>
        </article>
        <article>
          <TrendingUp aria-hidden="true" />
          <span>Tỷ lệ hoàn thành</span>
          <strong>{Math.round(statistics.completionRate)}%</strong>
        </article>
      </div>
    </section>
  );
}
