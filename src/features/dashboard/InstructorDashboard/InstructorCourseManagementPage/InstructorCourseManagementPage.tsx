import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Archive, BookOpen, Eye, Loader2, Search } from "lucide-react";
import {
  courseService,
  getCourseErrorMessage,
  type CourseStatus,
  type CourseSummary,
  type PaginatedCourses,
} from "../../../../services/course.service";
import "./InstructorCourseManagementPage.css";

const statusOptions: Array<{ label: string; value: CourseStatus | "all" }> = [
  { label: "Tất cả", value: "all" },
  { label: "Bản nháp", value: "draft" },
  { label: "Đã xuất bản", value: "published" },
  { label: "Đã lưu trữ", value: "archived" },
];

const statusLabels: Record<CourseStatus, string> = {
  archived: "Đã lưu trữ",
  draft: "Bản nháp",
  published: "Đã xuất bản",
};

export function InstructorCourseManagementPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CourseStatus | "all">("all");
  const [pagination, setPagination] = useState<Omit<
    PaginatedCourses,
    "items"
  > | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCourses() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await courseService.listInstructorCourses({
          page: 1,
          pageSize: 20,
          search,
          status: status === "all" ? undefined : status,
        });

        if (!controller.signal.aborted) {
          setCourses(response.items);
          setPagination({
            page: response.page,
            pageSize: response.pageSize,
            total: response.total,
            totalPages: response.totalPages,
          });
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(getCourseErrorMessage(loadError));
          setCourses([]);
          setPagination(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadCourses();

    return () => controller.abort();
  }, [search, status]);

  const publishedCount = useMemo(
    () => courses.filter((course) => course.status === "published").length,
    [courses],
  );

  return (
    <div className="instructor-courses">
      <header className="instructor-courses__hero">
        <div>
          <span>Quản lý khóa học</span>
          <h1>Khóa học của tôi</h1>
          <p>
            Danh sách này được tải từ API giảng viên và là nguồn dữ liệu sau khi
            làm mới trang.
          </p>
        </div>
        <div className="instructor-courses__stats" aria-label="Tổng quan khóa học">
          <article>
            <strong>{pagination?.total ?? courses.length}</strong>
            <span>Tổng khóa học</span>
          </article>
          <article>
            <strong>{publishedCount}</strong>
            <span>Đang xuất bản</span>
          </article>
        </div>
      </header>

      <section className="instructor-courses__toolbar" aria-label="Bộ lọc khóa học">
        <label className="instructor-courses__search">
          <Search aria-hidden="true" />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên, slug hoặc mô tả"
            type="search"
            value={search}
          />
        </label>
        <div className="instructor-courses__status-filter">
          {statusOptions.map((option) => (
            <button
              className={
                status === option.value
                  ? "instructor-courses__status instructor-courses__status--active"
                  : "instructor-courses__status"
              }
              key={option.value}
              onClick={() => setStatus(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <CourseState icon={<Loader2 aria-hidden="true" />} message="Đang tải khóa học..." />
      ) : null}

      {!isLoading && error ? (
        <CourseState icon={<Archive aria-hidden="true" />} message={error} tone="error" />
      ) : null}

      {!isLoading && !error && courses.length === 0 ? (
        <CourseState
          icon={<BookOpen aria-hidden="true" />}
          message="Chưa có khóa học phù hợp với bộ lọc hiện tại."
        />
      ) : null}

      {!isLoading && !error && courses.length > 0 ? (
        <section className="instructor-courses__table" aria-label="Danh sách khóa học">
          {courses.map((course) => (
            <article className="instructor-course-row" key={course.id}>
              <div className="instructor-course-row__main">
                <div className="instructor-course-row__thumb">
                  {course.thumbnailUrl ? (
                    <img alt="" src={course.thumbnailUrl} />
                  ) : (
                    <BookOpen aria-hidden="true" />
                  )}
                </div>
                <div>
                  <h2>{course.title}</h2>
                  <p>{course.description || "Chưa có mô tả khóa học."}</p>
                  <span>{course.slug}</span>
                </div>
              </div>
              <div className="instructor-course-row__meta">
                <span className={`instructor-course-row__badge instructor-course-row__badge--${course.status}`}>
                  {statusLabels[course.status]}
                </span>
                <span>{course.visibility === "private" ? "Riêng tư" : "Công khai"}</span>
                <a href={`/courses/${course.id}`}>
                  <Eye aria-hidden="true" />
                  Xem
                </a>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function CourseState({
  icon,
  message,
  tone = "neutral",
}: {
  icon: ReactNode;
  message: string;
  tone?: "error" | "neutral";
}) {
  return (
    <div
      className={`instructor-courses__state instructor-courses__state--${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {icon}
      <p>{message}</p>
    </div>
  );
}
