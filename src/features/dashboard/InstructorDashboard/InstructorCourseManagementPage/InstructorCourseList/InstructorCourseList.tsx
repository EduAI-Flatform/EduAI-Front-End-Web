import { currentSystemLocale } from "../../../../platform/translate-system-message";
import { SystemText, useSystemMessages } from "../../../../platform/SystemText";
import {
  Archive,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  ListChecks,
  CircleHelp,
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
import { descriptionPlainText } from "../../../../../components/content/RichDescription";

const statusLabels: Record<CourseStatus, string> = {
  archived: "Đã lưu trữ",
  draft: "Bản nháp",
  published: "Đã xuất bản",
};

const dateFormatter = new Intl.DateTimeFormat(currentSystemLocale(), {
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
  const messageForUi = useSystemMessages();
  return (
    <section className="instructor-course-list" aria-labelledby="course-list-title">
      <header className="instructor-course-list__header">
        <div>
          <span><SystemText message={"Danh mục nội dung"} /></span>
          <h2 id="course-list-title"><SystemText message="Danh sách khóa học" /></h2>
        </div>
        <p>{pagination.total} <SystemText message={"khóa học"} /></p>
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
                    <SystemText message={statusLabels[course.status]} />
                  </span>
                </div>
                <p>{descriptionPlainText(course.description) || <SystemText message={"Khóa học chưa có mô tả."} />}</p>
                <div className="instructor-course-item__meta">
                  <span>{course.visibility === "private" ? <SystemText message={"Riêng tư"} /> : <SystemText message={"Công khai"} />}</span>
                  <span><SystemText message="Cập nhật" />{" "}{dateFormatter.format(new Date(course.updatedAt))}</span>
                </div>
              </div>

              <div className="instructor-course-item__actions">
                <Link aria-label={`${messageForUi("Xem trước khóa học ")}${course.title}`} to={`/courses/${course.id}?preview=1`}>
                  <Eye aria-hidden="true" /><SystemText message="Xem trước" /></Link>
                <button
                  aria-label={`${messageForUi("Chỉnh sửa khóa học ")}${course.title}`}
                  onClick={() => onEdit(course)}
                  type="button"
                >
                  <Pencil aria-hidden="true" /><SystemText message="Sửa" /></button>
                <Link
                  aria-label={`${messageForUi("Quản lý bài học của khóa học ")}${course.title}`}
                  to={`/instructor/dashboard/courses/${course.id}/lessons`}
                >
                  <ListChecks aria-hidden="true" /><SystemText message="Bài học" /></Link>
                <Link
                  aria-label={`${messageForUi("Quản lý quiz của khóa học ")}${course.title}`}
                  to={`/instructor/dashboard/courses/${course.id}/quizzes`}
                >
                  <CircleHelp aria-hidden="true" />
                  <SystemText message={"Bài kiểm tra"} />
                </Link>
                <Link
                  aria-label={`${messageForUi("Quản lý bài tập của khóa học ")}${course.title}`}
                  to={`/instructor/dashboard/courses/${course.id}/assignments`}
                >
                  <ClipboardCheck aria-hidden="true" /><SystemText message="Bài tập" /></Link>
                {course.status !== "published" ? (
                  <button
                    aria-label={`${messageForUi("Xuất bản khóa học ")}${course.title}`}
                    disabled={mutatingCourseId === course.id}
                    onClick={() => onPublish(course)}
                    type="button"
                  >
                    <Upload aria-hidden="true" /><SystemText message="Xuất bản" /></button>
                ) : null}
                {course.status !== "archived" ? (
                  <button
                    aria-label={`${messageForUi("Lưu trữ khóa học ")}${course.title}`}
                    disabled={mutatingCourseId === course.id}
                    onClick={() => onArchive(course)}
                    type="button"
                  >
                    <Archive aria-hidden="true" /><SystemText message="Lưu trữ" /></button>
                ) : null}
                {course.status === "published" && course.visibility === "public" ? (
                  <Link aria-label={`${messageForUi("Xem khóa học ")}${course.title}`} to={`/courses/${course.id}`}>
                    <Eye aria-hidden="true" />
                    <SystemText message={"Xem"} />
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {pagination.totalPages > 1 ? (
        <nav className="instructor-course-list__pagination" aria-label={messageForUi("Phân trang khóa học")}>
          <button
            aria-label={messageForUi("Trang trước")}
            disabled={pagination.page <= 1 || isLoading}
            onClick={() => onPageChange(pagination.page - 1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span><SystemText message={"Trang"} /> {pagination.page} / {pagination.totalPages}</span>
          <button
            aria-label={messageForUi("Trang sau")}
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
