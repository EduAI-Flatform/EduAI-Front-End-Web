import { SystemText, useSystemMessages } from "../../../platform/SystemText";
import { BookOpen, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  enrollmentService,
  getEnrollmentErrorMessage,
  type Enrollment,
} from "../../../../services/enrollment.service";
import { MyCourseCard } from "./MyCourseCard/MyCourseCard";
import "./MyLearningPage.css";
import { usePlatform } from "../../../platform/PlatformProvider";
import { learningStatus, type LearningStatus } from "./learning-status";

export function MyLearningPage() {
  const { t } = usePlatform();
  const messageForUi = useSystemMessages();
  const [filter, setFilter] = useState<LearningStatus | "all">("all");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadEnrollments = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      setEnrollments(await enrollmentService.listMyEnrollments());
    } catch (loadError) {
      setError(getEnrollmentErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  const visible = enrollments.filter(item => filter === "all" || learningStatus(item) === filter);
  const filters = [["all", t("Tất cả", "All")], ["not_started", t("Chưa bắt đầu", "Not started")], ["in_progress", t("Đang học", "In progress")], ["completed", t("Hoàn thành", "Completed")]] as const;
  return (
    <div className="my-learning student-dashboard__shell container">
      <header className="my-learning__header">
        <div>
          <span><SystemText message={"Không gian học tập"} /></span>
          <h1><SystemText message="Khóa học của tôi" /></h1>
          <p><SystemText message={"Theo dõi tiến độ và tiếp tục hành trình học tập của bạn."} /></p>
        </div>
        {!isLoading && !error && enrollments.length > 0 ? (
          <strong>{enrollments.length} <SystemText message={"khóa học"} /></strong>
        ) : null}
      </header>

      {!isLoading && !error && enrollments.length > 0 && <nav className="my-learning__filters" aria-label={t('Trạng thái khóa học', 'Course status')}>
        {filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
          {label}<span>{value === 'all' ? enrollments.length : enrollments.filter(item => learningStatus(item) === value).length}</span>
        </button>)}
      </nav>}
      {!isLoading && !error && enrollments.length > 0 && visible.length === 0 && <section className="my-learning__state" role="status">
        <BookOpen aria-hidden="true" /><h2>{t('Chưa có khóa học ở trạng thái này', 'No courses with this status')}</h2>
        <p>{t('Chọn trạng thái khác để xem các khóa học của bạn.', 'Choose another status to view your courses.')}</p>
        <button type="button" onClick={() => setFilter('all')}>{t('Xem tất cả khóa học', 'View all courses')}</button>
      </section>}
      {isLoading ? <LoadingState /> : null}

      {!isLoading && error ? (
        <section className="my-learning__state" role="alert">
          <RefreshCw aria-hidden="true" />
          <h2><SystemText message="Chưa thể tải khóa học" /></h2>
          <p><SystemText message={error} /></p>
          <button onClick={() => void loadEnrollments()} type="button">
            <RefreshCw aria-hidden="true" /><SystemText message="Thử lại" /></button>
        </section>
      ) : null}

      {!isLoading && !error && enrollments.length === 0 ? (
        <section className="my-learning__state">
          <BookOpen aria-hidden="true" />
          <h2><SystemText message="Bạn chưa tham gia khóa học nào" /></h2>
          <p><SystemText message={"Khám phá thư viện khóa học và bắt đầu học theo mục tiêu của bạn."} /></p>
          <Link to="/courses"><SystemText message="Khám phá khóa học" /></Link>
        </section>
      ) : null}

      {!isLoading && !error && enrollments.length > 0 ? (
        <section aria-label={messageForUi("Danh sách khóa học đã đăng ký")} className="my-learning__grid">
          {visible.map((enrollment) => (
            <MyCourseCard enrollment={enrollment} key={enrollment.id} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function LoadingState() {
  const messageForUi = useSystemMessages();
  return (
    <section
      aria-label={messageForUi("Đang tải khóa học")}
      aria-live="polite"
      className="my-learning__grid"
    >
      {[0, 1, 2].map((item) => (
        <div className="my-learning__skeleton" key={item}>
          <span />
          <div>
            <i />
            <i />
            <i />
          </div>
        </div>
      ))}
    </section>
  );
}
