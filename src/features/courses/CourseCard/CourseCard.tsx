import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { CourseListItem } from "../course-list.types";
import { courseLevelLabels } from "../course-display";
import "./CourseCard.css";

interface CourseCardProps {
  course: CourseListItem;
}

export function CourseCard({ course }: CourseCardProps) {
  const detailPath = course.detailPath ?? `/courses/${course.id}`;

  return (
    <article className="course-card">
      <div className="course-card__image">
        {course.thumbnailUrl ? (
          <img alt="" src={course.thumbnailUrl} />
        ) : (
          <BookOpen aria-hidden="true" className="course-card__fallback" />
        )}
        <span className="course-card__image-badge">
          {course.badge ?? "Công khai"}
        </span>
        <span className="course-card__duration">
          {course.durationLabel ?? "EduAI"}
        </span>
      </div>
      <div className="course-card__body">
        <div className="course-card__meta">
          <Sparkles aria-hidden="true" className="course-card__meta-icon" />
          <span>{courseLevelLabels[course.level]}</span>
        </div>
        <h3>{course.title}</h3>
        <p className="course-card__provider">
          {course.instructorName ?? "Nền tảng EduAI"}
        </p>
        <p className="course-card__description">{course.description}</p>
        <div className="course-card__footer">
          <span className="course-card__price">
            {course.priceLabel ?? "Sắp mở ghi danh"}
          </span>
          <Link className="course-card__link" to={detailPath}>
            Xem chi tiết
            <ArrowRight aria-hidden="true" className="course-card__link-icon" />
          </Link>
        </div>
      </div>
    </article>
  );
}
