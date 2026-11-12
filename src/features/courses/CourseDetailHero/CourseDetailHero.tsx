import { SystemText } from "../../platform/SystemText";
import { Rocket, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { CourseDetailView } from "../course-detail.types";
import "./CourseDetailHero.css";
import { descriptionPlainText } from "../../../components/content/RichDescription";

interface CourseDetailHeroProps {
  course: CourseDetailView;
  isEnrolled: boolean;
  previewMode?: boolean;
  onEnroll: () => void;
  onSyllabus: () => void;
}

export function CourseDetailHero({ course, isEnrolled, previewMode = false, onEnroll, onSyllabus }: CourseDetailHeroProps) {
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
            <SystemText message={"← Tất cả khóa học"} />
          </Link>
          <span className="course-detail-pill">
            <Sparkles aria-hidden="true" />
            {course.badge ?? <SystemText message={"Khóa học GDS"} />}
          </span>
          <h1>{course.title}</h1>
          <p>{descriptionPlainText(course.description) || <SystemText message={"Khóa học chưa có mô tả chi tiết."} />}</p>

          <div className="course-detail-instructor-line">
            {course.instructor.avatarUrl ? (
              <img alt="" src={course.instructor.avatarUrl} />
            ) : (
              <span>{course.instructor.fullName.slice(0, 1)}</span>
            )}
            <div>
              <small><SystemText message="Giảng viên" /></small>
              <strong>{course.instructor.fullName}</strong>
            </div>
          </div>

          <div className="course-detail-hero__actions">
            <button className="course-detail-primary-action" onClick={onEnroll} type="button">
              <Rocket aria-hidden="true" />
              {previewMode ? <SystemText message={"Xem trước bài học"} /> : isEnrolled ? <SystemText message={"Tiếp tục học"} /> : <SystemText message={"Đăng ký học"} />}
            </button>
            <button className="course-detail-secondary-action" onClick={onSyllabus} type="button">
              <SystemText message={"Xem giáo trình"} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
