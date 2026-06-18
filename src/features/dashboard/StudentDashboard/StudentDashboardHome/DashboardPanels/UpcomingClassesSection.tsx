import { Bot, CalendarClock, Video } from "lucide-react";
import "./UpcomingClassesSection.css";

export function UpcomingClassesSection() {
  return (
    <section className="student-dashboard__panel student-dashboard__classes">
      <div className="student-dashboard__panel-header">
        <h2>Lớp học sắp tới</h2>
        <CalendarClock aria-hidden="true" />
      </div>
      <div className="student-dashboard__timeline">
        <article className="student-dashboard__timeline-item student-dashboard__timeline-item--active">
          <span className="student-dashboard__timeline-icon">
            <Video aria-hidden="true" />
          </span>
          <p>20:00 - Ngày mai</p>
          <h3>React Workshop</h3>
          <span>Giảng viên: Dr. Alan Turing</span>
          <button type="button">Đặt lịch nhắc</button>
        </article>
        <article className="student-dashboard__timeline-item">
          <span className="student-dashboard__timeline-icon">
            <Bot aria-hidden="true" />
          </span>
          <p>Thứ sáu, 15:00</p>
          <h3>Thảo luận đạo đức AI</h3>
          <span>Khách mời: Sophia AI</span>
        </article>
      </div>
    </section>
  );
}
