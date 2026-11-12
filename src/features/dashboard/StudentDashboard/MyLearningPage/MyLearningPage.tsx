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

export function MyLearningPage() {
  const messageForUi = useSystemMessages();
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
          {enrollments.map((enrollment) => (
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
