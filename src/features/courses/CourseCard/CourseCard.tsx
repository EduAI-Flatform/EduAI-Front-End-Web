import { ArrowRight, BookOpen, Sparkles, Star, UserRound } from "lucide-react";
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
        <span className="course-card__duration">
          {view.durationLabel}
        </span>
      </div>
      <div className="course-card__body">
        <div className="course-card__badge-row">
          {course.badge ? <span className="course-card__badge">{course.badge}</span> : null}
        </div>
        <div className="course-card__meta">
          <Sparkles aria-hidden="true" className="course-card__meta-icon" />
          <span>{courseLevelLabels[course.level]}</span>
        </div>
        <h3>{course.title}</h3>
        <div className="course-card__details">
          <p className="course-card__provider">
            <UserRound aria-hidden="true" className="course-card__provider-icon" />
            {view.instructorName}
          </p>
          <p className="course-card__rating">
            <Star aria-hidden="true" className="course-card__rating-icon" />
            {view.ratingLabel}
          </p>
        </div>
        <div className="course-card__footer">
          <div className="course-card__price" aria-label="Giá khóa học">
            {view.priceDisplay.originalLabel ? (
              <del className="course-card__price-original">
                {view.priceDisplay.originalLabel}
              </del>
            ) : null}
            <span>{view.priceDisplay.finalLabel}</span>
            {view.priceDisplay.promotionLabel ? (
              <small>{view.priceDisplay.promotionLabel}</small>
            ) : null}
          </div>
          <Link className="course-card__link" to={detailPath}>
            Xem chi tiết
            <ArrowRight aria-hidden="true" className="course-card__link-icon" />
          </Link>
        </div>
      </div>
    </article>
  );
}
