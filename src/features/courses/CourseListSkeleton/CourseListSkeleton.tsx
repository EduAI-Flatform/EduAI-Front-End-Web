import "./CourseListSkeleton.css";

export function CourseListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải danh sách khóa học"
      className="courses-grid"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="course-card course-card--skeleton" key={index}>
          <div className="course-card__image" />
          <div className="course-card__body">
            <span />
            <h3 />
            <p />
            <p />
          </div>
        </div>
      ))}
    </div>
  );
}
