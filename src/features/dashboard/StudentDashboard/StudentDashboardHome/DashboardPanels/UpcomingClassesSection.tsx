import { CalendarClock, Video } from "lucide-react";
import type { DashboardSession } from "../../../../../services/dashboard.service";
import "./UpcomingClassesSection.css";

export function UpcomingClassesSection({
  sessions,
}: {
  sessions: DashboardSession[];
}) {
  return (
    <section className="student-dashboard__panel student-dashboard__classes">
      <div className="student-dashboard__panel-header">
        <h2>Lớp học sắp tới</h2>
        <CalendarClock aria-hidden="true" />
      </div>
      <div className="student-dashboard__timeline">
        {sessions.length > 0 ? (
          sessions.map((session, index) => (
            <article
              className={`student-dashboard__timeline-item${
                index === 0 ? " student-dashboard__timeline-item--active" : ""
              }`}
              key={session.id}
            >
              <span className="student-dashboard__timeline-icon">
                <Video aria-hidden="true" />
              </span>
              <p>{formatSessionDate(session.scheduledStart)}</p>
              <h3>{session.title}</h3>
              <span>Giảng viên: {session.instructor.fullName}</span>
              {session.meetingUrl ? (
                <a href={session.meetingUrl} rel="noreferrer" target="_blank">
                  Mở phòng học
                </a>
              ) : null}
            </article>
          ))
        ) : (
          <p role="status">Chưa có lớp học sắp tới.</p>
        )}
      </div>
    </section>
  );
}

function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
