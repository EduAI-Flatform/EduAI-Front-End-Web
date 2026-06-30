import {
  Archive,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import type {
  CourseStatus,
  CourseSummary,
  PaginatedCourses,
} from "../../../../../services/course.service";
import "./InstructorCourseList.css";

const statusLabels: Record<CourseStatus, string> = {
  archived: "Đã lưu trữ",
  draft: "Bản nháp",
  published: "Đã xuất bản",
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

interface InstructorCourseListProps {
  courses: CourseSummary[];
  error: string | null;
  isLoading: boolean;
  mutatingCourseId: string | null;
  onArchive: (course: CourseSummary) => void;
  onEdit: (course: CourseSummary) => void;
  onPageChange: (page: number) => void;
  onPublish: (course: CourseSummary) => void;
  pagination: Omit<PaginatedCourses, "items">;
}

export function InstructorCourseList({
  courses,
  error,
  isLoading,
  mutatingCourseId,
  onArchive,
  onEdit,
  onPageChange,
  onPublish,
  pagination,
}: InstructorCourseListProps) {
  return (
    <section className="instructor-course-list" aria-labelledby="course-list-title">
      <header className="instructor-course-list__header">
        <div>
          <span>Danh mục nội dung</span>
          <h2 id="course-list-title">Danh sách khóa học</h2>
        </div>
        <p>{pagination.total} khóa học</p>
      </header>

      {isLoading ? <CourseListState icon={Loader2} message="Đang tải khóa học..." loading /> : null}
      {!isLoading && error ? <CourseListState icon={Archive} message={error} tone="error" /> : null}
      {!isLoading && !error && courses.length === 0 ? (
        <CourseListState icon={BookOpen} message="Không có khóa học phù hợp với bộ lọc hiện tại." />
      ) : null}

      {!isLoading && !error && courses.length > 0 ? (
        <div className="instructor-course-list__items">
          {courses.map((course) => (
            <article className="instructor-course-item" key={course.id}>
              <div className="instructor-course-item__thumbnail">
                {course.thumbnailUrl ? <img alt="" src={course.thumbnailUrl} /> : <BookOpen aria-hidden="true" />}
              </div>

              <div className="instructor-course-item__content">
                <div className="instructor-course-item__title">
                  <h3>{course.title}</h3>
                  <span className={`instructor-course-item__status instructor-course-item__status--${course.status}`}>
                    {statusLabels[course.status]}
                  </span>
                </div>
                <p>{course.description || "Khóa học chưa có mô tả."}</p>
                <div className="instructor-course-item__meta">
                  <span>{course.visibility === "private" ? "Riêng tư" : "Công khai"}</span>
                  <span>Cập nhật {dateFormatter.format(new Date(course.updatedAt))}</span>
                </div>
              </div>

              <div className="instructor-course-item__actions">
                <button
                  aria-label={`Chỉnh sửa khóa học ${course.title}`}
                  onClick={() => onEdit(course)}
                  type="button"
                >
                  <Pencil aria-hidden="true" />
                  Sửa
                </button>
                {course.status !== "published" ? (
                  <button
                    aria-label={`Xuất bản khóa học ${course.title}`}
                    disabled={mutatingCourseId === course.id}
                    onClick={() => onPublish(course)}
                    type="button"
                  >
                    <Upload aria-hidden="true" />
                    Xuất bản
                  </button>
                ) : null}
                {course.status !== "archived" ? (
                  <button
                    aria-label={`Lưu trữ khóa học ${course.title}`}
                    disabled={mutatingCourseId === course.id}
                    onClick={() => onArchive(course)}
                    type="button"
                  >
                    <Archive aria-hidden="true" />
                    Lưu trữ
                  </button>
                ) : null}
                {course.status === "published" && course.visibility === "public" ? (
                  <Link aria-label={`Xem khóa học ${course.title}`} to={`/courses/${course.id}`}>
                    <Eye aria-hidden="true" />
                    Xem
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {pagination.totalPages > 1 ? (
        <nav className="instructor-course-list__pagination" aria-label="Phân trang khóa học">
          <button
            aria-label="Trang trước"
            disabled={pagination.page <= 1 || isLoading}
            onClick={() => onPageChange(pagination.page - 1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span>Trang {pagination.page} / {pagination.totalPages}</span>
          <button
            aria-label="Trang sau"
            disabled={pagination.page >= pagination.totalPages || isLoading}
            onClick={() => onPageChange(pagination.page + 1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </section>
  );
}

function CourseListState({
  icon: Icon,
  loading = false,
  message,
  tone = "neutral",
}: {
  icon: typeof BookOpen;
  loading?: boolean;
  message: string;
  tone?: "error" | "neutral";
}) {
  return (
    <div className={`instructor-course-list__state instructor-course-list__state--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon aria-hidden="true" className={loading ? "is-spinning" : undefined} />
      <p>{message}</p>
    </div>
  );
}
