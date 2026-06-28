import { CalendarDays, GraduationCap, TrendingUp } from "lucide-react";
import "./InstructorHeroSection.css";

interface InstructorHeroSectionProps {
  firstName: string;
}

export function InstructorHeroSection({ firstName }: InstructorHeroSectionProps) {
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
          <strong>3 phiên</strong>
        </article>
        <article>
          <TrendingUp aria-hidden="true" />
          <span>Tỷ lệ hoàn thành</span>
          <strong>82%</strong>
        </article>
      </div>
    </section>
  );
}
