import { Rocket, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { CourseDetailView } from "../course-detail.types";
import "./CourseDetailHero.css";

interface CourseDetailHeroProps {
  course: CourseDetailView;
}

export function CourseDetailHero({ course }: CourseDetailHeroProps) {
  return (
    <section className="course-detail-hero">
      {course.thumbnailUrl ? (
        <img
          alt=""
          className="course-detail-hero__image"
          src={course.thumbnailUrl}
        />
      ) : null}
      <div className="course-detail-hero__overlay" />
      <div className="container course-detail-hero__content">
        <div className="course-detail-hero__copy">
          <Link className="course-detail-back" to="/courses">
            ← Tất cả khóa học
          </Link>
          <span className="course-detail-pill">
            <Sparkles aria-hidden="true" />
            {course.badge ?? "Advanced AI Specialization"}
          </span>
          <h1>{course.title}</h1>
          <p>{course.description}</p>

          <div className="course-detail-instructor-line">
            {course.instructorAvatarUrl ? (
              <img alt="" src={course.instructorAvatarUrl} />
            ) : (
              <span>{(course.instructorName ?? "E").slice(0, 1)}</span>
            )}
            <div>
              <small>Giảng viên</small>
              <strong>{course.instructorName ?? "Giảng viên EduAI"}</strong>
            </div>
          </div>

          <div className="course-detail-hero__actions">
            <button className="course-detail-primary-action" type="button">
              <Rocket aria-hidden="true" />
              Đăng ký học
            </button>
            <button className="course-detail-secondary-action" type="button">
              Xem giáo trình
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
