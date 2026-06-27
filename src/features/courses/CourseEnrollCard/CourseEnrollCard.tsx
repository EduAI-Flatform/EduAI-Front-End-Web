import { CheckCircle2, PlayCircle, Star } from "lucide-react";
import type { CourseDetailView } from "../course-detail.types";
import "./CourseEnrollCard.css";

interface CourseEnrollCardProps {
  course: CourseDetailView;
}

export function CourseEnrollCard({ course }: CourseEnrollCardProps) {
  return (
    <section className="course-detail-enroll" aria-label="Đăng ký khóa học">
      <div className="course-detail-enroll__price">
        <span>{course.priceLabel ?? "Sắp mở ghi danh"}</span>
        <small>{course.ratingLabel ?? "Chưa có đánh giá"}</small>
      </div>
      <button className="course-detail-enroll__button" type="button" disabled>
        Đăng ký học
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
