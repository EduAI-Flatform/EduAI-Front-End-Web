import { SystemText, useSystemMessages } from "../../../../platform/SystemText";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Layers3,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Enrollment } from "../../../../../services/enrollment.service";
import "./MyCourseCard.css";

interface MyCourseCardProps {
  enrollment: Enrollment;
}

const levelLabels = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
} as const;

export function MyCourseCard({ enrollment }: MyCourseCardProps) {
  const messageForUi = useSystemMessages();
  const { course, progress } = enrollment;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(progress.progressPercent)),
  );
  const isComplete = progressPercent === 100 || enrollment.status === "completed";

  return (
    <article className="my-course-card">
      <div className="my-course-card__media">
        {course.thumbnailUrl ? (
          <img
            alt={`${messageForUi("Ảnh khóa học ")}${course.title}`}
            loading="lazy"
            src={course.thumbnailUrl}
          />
        ) : (
          <div className="my-course-card__placeholder">
            <BookOpenCheck aria-hidden="true" />
          </div>
        )}
        <span className="my-course-card__level"><SystemText message={levelLabels[course.level]} /></span>
      </div>

      <div className="my-course-card__body">
        <div className="my-course-card__heading">
          <h2>{course.title}</h2>
          {isComplete ? (
            <span className="my-course-card__complete">
              <CheckCircle2 aria-hidden="true" />
              <SystemText message={"Hoàn thành"} />
            </span>
          ) : null}
        </div>

        {course.description ? <p>{course.description}</p> : null}

        <div className="my-course-card__progress-copy">
          <span><SystemText message="Tiến độ" /></span>
          <strong>{progressPercent}%</strong>
        </div>
        <div
          aria-label={`${messageForUi("Tiến độ ")}${progressPercent}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progressPercent}
          className="my-course-card__progress"
          role="progressbar"
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="my-course-card__footer">
          <span>
            <Layers3 aria-hidden="true" />
            {progress.completedLessons}/{progress.totalLessons} <SystemText message={"bài học"} />
          </span>
          <Link to={`/learning/${course.id}`}>
            {isComplete ? <SystemText message={"Xem lại"} /> : <SystemText message={"Tiếp tục học"} />}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
