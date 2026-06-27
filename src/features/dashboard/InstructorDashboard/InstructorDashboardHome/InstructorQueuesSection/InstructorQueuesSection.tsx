import { ArrowRight, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import "./InstructorQueuesSection.css";

const queues = [
  { title: "Chấm bài Python nâng cao", meta: "12 bài nộp · hạn hôm nay", tone: "urgent" },
  { title: "Duyệt nội dung khóa AI căn bản", meta: "4 lesson đang nháp", tone: "normal" },
  { title: "Chuẩn bị lớp Live: Prompt Engineering", meta: "19:30 · 46 học viên", tone: "normal" },
];

export function InstructorQueuesSection() {
  return (
    <section className="instructor-dashboard-home__panel instructor-home-queues">
      <div className="instructor-dashboard-home__panel-header">
        <div>
          <h2>Việc cần xử lý</h2>
          <p>Ưu tiên công việc trong ngày</p>
        </div>
        <Clock3 aria-hidden="true" />
      </div>

      <div className="instructor-home-queues__list">
        {queues.map((queue) => (
          <article className={`instructor-home-queue instructor-home-queue--${queue.tone}`} key={queue.title}>
            <span />
            <div>
              <h3>{queue.title}</h3>
              <p>{queue.meta}</p>
            </div>
          </article>
        ))}
      </div>

      <Link className="instructor-home-queues__link" to="/instructor/dashboard/assignments">
        Xem toàn bộ hàng đợi
        <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}
