import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  PlayCircle,
  Star,
} from "lucide-react";
import type { CourseDetailView } from "../course-detail.types";
import "./CourseEnrollCard.css";

interface CourseEnrollCardProps {
  course: CourseDetailView;
  enrollmentError: string | null;
  isEnrolled: boolean;
  isEnrollmentLoading: boolean;
  isSubmitting: boolean;
  onEnroll: () => void;
}

export function CourseEnrollCard({
  course,
  enrollmentError,
  isEnrolled,
  isEnrollmentLoading,
  isSubmitting,
  onEnroll,
}: CourseEnrollCardProps) {
  let buttonLabel = "Đăng ký học";

  if (isEnrollmentLoading) {
    buttonLabel = "Đang kiểm tra...";
  } else if (isSubmitting) {
    buttonLabel = "Đang ghi danh...";
  } else if (isEnrolled) {
    buttonLabel = "Tiếp tục học";
  }

  return (
    <section className="course-detail-enroll" aria-label="Đăng ký khóa học">
      <div className="course-detail-enroll__price">
        <span>{course.priceLabel ?? "Sắp mở ghi danh"}</span>
        <small>{course.ratingLabel ?? "Chưa có đánh giá"}</small>
      </div>
      {isEnrolled ? (
        <p className="course-detail-enroll__status" role="status">
          <CheckCircle2 aria-hidden="true" />
          Bạn đã đăng ký khóa học này.
        </p>
      ) : null}
      {enrollmentError ? (
        <p className="course-detail-enroll__error" role="alert">
          <AlertCircle aria-hidden="true" />
          {enrollmentError}
        </p>
      ) : null}
      <button
        className="course-detail-enroll__button"
        disabled={isEnrollmentLoading || isSubmitting}
        onClick={onEnroll}
        type="button"
      >
        {isEnrollmentLoading || isSubmitting ? (
          <LoaderCircle aria-hidden="true" className="course-detail-enroll__spinner" />
        ) : null}
        {buttonLabel}
      </button>
      <button className="course-detail-enroll__preview" type="button">
        <PlayCircle aria-hidden="true" />
        Xem bài học thử
      </button>
      <ul className="course-detail-enroll__features">
        <li>
          <CheckCircle2 aria-hidden="true" />
          Truy cập toàn bộ bài học sau khi ghi danh.
        </li>
        <li>
          <Star aria-hidden="true" />
          Theo dõi tiến độ và tiêu chí chứng chỉ.
        </li>
      </ul>
    </section>
  );
}
