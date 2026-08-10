import { Clock3 } from "lucide-react";
import type { InstructorWorkQueueItem } from "../../../../../services/dashboard.service";
import "./InstructorQueuesSection.css";

export function InstructorQueuesSection({
  queues,
}: {
  queues: InstructorWorkQueueItem[];
}) {
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
        {queues.length > 0 ? queues.map((queue) => (
          <article
            className={`instructor-home-queue instructor-home-queue--${queue.priority}`}
            key={`${queue.type}-${queue.id}`}
          >
            <span />
            <div>
              <h3>{queue.title}</h3>
              <p>
                {queue.description}
                {queue.dueAt
                  ? ` · ${new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(queue.dueAt))}`
                  : ""}
              </p>
            </div>
          </article>
        )) : (
          <p role="status">Không có việc nào đang chờ xử lý.</p>
        )}
      </div>
    </section>
  );
}
