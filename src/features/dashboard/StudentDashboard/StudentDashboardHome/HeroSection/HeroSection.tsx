import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { StudentActiveCourse } from "../../../../../services/dashboard.service";
import "./HeroSection.css";

interface HeroSectionProps {
  continueCourse: StudentActiveCourse | null;
  firstName: string;
}

export function HeroSection({ continueCourse, firstName }: HeroSectionProps) {
  return (
    <section className="student-dashboard__hero">
      <div className="student-dashboard__hero-pattern" />
      <div className="student-dashboard__hero-content">
        <div>
          <h1>Xin chào {firstName}</h1>
          <p>
            Chào mừng bạn quay trở lại. Bạn đang làm rất tốt, hãy tiếp tục hành trình chinh
            phục tri thức AI hôm nay.
          </p>
        </div>

        <article className="student-dashboard__continue-card">
          {continueCourse ? (
            <>
              <p>Tiếp tục học</p>
              <h2>{continueCourse.course.title}</h2>
              <div className="student-dashboard__progress">
                <span
                  style={{ width: `${continueCourse.progress.progressPercent}%` }}
                />
              </div>
              <div className="student-dashboard__continue-footer">
                <span>
                  {Math.round(continueCourse.progress.progressPercent)}% hoàn thành
                </span>
                <Link
                  to={`/learning/${continueCourse.course.id}${
                    continueCourse.nextLesson
                      ? `?lesson=${continueCourse.nextLesson.id}`
                      : ""
                  }`}
                >
                  Tiếp tục học
                </Link>
              </div>
            </>
          ) : (
            <>
              <p>Hành trình học tập</p>
              <h2>Chưa có khóa học đang học</h2>
              <div className="student-dashboard__continue-footer">
                <span>Khám phá khóa học phù hợp với bạn.</span>
                <Link to="/courses">Xem khóa học</Link>
              </div>
            </>
          )}
        </article>
      </div>
      <div className="student-dashboard__hero-orb" aria-hidden="true">
        <Sparkles className="student-dashboard__hero-orb-icon" />
      </div>
    </section>
  );
}
