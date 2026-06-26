import "./CourseDetailSkeleton.css";

export function CourseDetailSkeleton() {
  return (
    <main className="course-detail-page">
      <section className="course-detail-skeleton-hero" aria-busy="true">
        <div className="container course-detail-skeleton-hero__content">
          <div className="course-detail-skeleton course-detail-skeleton--eyebrow" />
          <div className="course-detail-skeleton course-detail-skeleton--title" />
          <div className="course-detail-skeleton course-detail-skeleton--copy" />
          <div className="course-detail-skeleton course-detail-skeleton--actions" />
        </div>
      </section>
    </main>
  );
}
