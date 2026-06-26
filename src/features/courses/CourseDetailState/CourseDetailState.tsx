import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import "./CourseDetailState.css";

interface CourseDetailStateProps {
  message: string;
}

export function CourseDetailState({ message }: CourseDetailStateProps) {
  return (
    <main className="course-detail-page">
      <section className="course-detail-state container" role="alert">
        <BookOpen aria-hidden="true" className="course-detail-state__icon" />
        <h1>Không thể mở khóa học</h1>
        <p>{message}</p>
        <Link className="course-detail-state__link" to="/courses">
          Quay lại danh sách khóa học
        </Link>
      </section>
    </main>
  );
}
