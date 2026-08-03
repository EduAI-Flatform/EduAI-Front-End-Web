import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { CourseListItem } from "../course-list.types";
import {
  courseLevelLabels,
  getCourseCardViewModel,
} from "../course-display";
import "./CourseCard.css";

interface CourseCardProps {
  course: CourseListItem;
}

export function CourseCard({ course }: CourseCardProps) {
  const detailPath = `/courses/${course.id}`;
  const view = getCourseCardViewModel(course);

  return (
    <article className="course-card">
      <div className="course-card__image">
        {course.thumbnailUrl ? (
          <img alt={`Ảnh khóa học ${course.title}`} src={course.thumbnailUrl} />
        ) : (
          <BookOpen aria-hidden="true" className="course-card__fallback" />
        )}
        <span className="course-card__image-badge">
          {course.badge ?? courseLevelLabels[course.level]}
        </span>
        <span className="course-card__duration">
          {view.durationLabel}
        </span>
      </div>
      <div className="course-card__body">
        <div className="course-card__meta">
          <Sparkles aria-hidden="true" className="course-card__meta-icon" />
          <span>{courseLevelLabels[course.level]}</span>
        </div>
        <h3>{course.title}</h3>
        <p className="course-card__provider">
          {view.instructorName}
        </p>
        <p className="course-card__description">{view.description}</p>
        <div className="course-card__footer">
          <span className="course-card__price">
            {view.priceLabel}
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
