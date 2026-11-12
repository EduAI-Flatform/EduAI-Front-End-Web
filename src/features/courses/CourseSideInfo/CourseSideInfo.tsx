import { SystemValue } from '@/features/platform/SystemText';
import { SystemText, useSystemMessages } from "../../platform/SystemText";
import { Award, CheckCircle2, Circle, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { CourseDetailView } from "../course-detail.types";
import type { CourseSummary } from "../../../services/course.service";
import { formatCoursePrice } from "../course-display";
import "./CourseSideInfo.css";

interface CourseSideInfoProps {
  course: CourseDetailView;
  relatedCourses: CourseSummary[];
}

export function CourseSideInfo({
  course,
  relatedCourses,
}: CourseSideInfoProps) {
  const messageForUi = useSystemMessages();
  return (
    <div className="course-detail-side">
      <section className="course-detail-card course-certificate-card">
        <div className="course-detail-card__heading">
          <Award aria-hidden="true" />
          <h3><SystemText message={"Tiêu chí chứng chỉ"} /></h3>
        </div>
        <ul className="course-certificate">
          <li>
            <CheckCircle2 aria-hidden="true" />
            <SystemText message={"Hoàn thành 100% khóa học"} />
          </li>
          <li>
            <Circle aria-hidden="true" />
            <SystemText message={"Điểm quiz trung bình > 70%"} />
          </li>
        </ul>
      </section>

      <section className="course-detail-card">
        <h3><SystemText message="Giảng viên" /></h3>
        <div className="course-instructor">
          {course.instructor.avatarUrl ? (
            <img alt="" src={course.instructor.avatarUrl} />
          ) : (
            <span className="course-instructor__avatar">
              <UserRound aria-hidden="true" />
            </span>
          )}
          <div>
            <h4>{course.instructor.fullName}</h4>
            <p>{course.instructor.headline ?? <SystemText message={"Giảng viên GDS"} />}</p>
          </div>
        </div>
        <p className="course-instructor__bio">
          {course.instructor.bio ?? <SystemText message={"Giảng viên chưa cập nhật phần giới thiệu."} />}
        </p>
        <button className="course-instructor__button" type="button">
          <SystemText message={"Xem hồ sơ"} />
        </button>
      </section>

      {relatedCourses.length > 0 ? (
        <section className="course-related">
          <h3><SystemText message={"Khóa học liên quan"} /></h3>
          <div className="course-related__list">
            {relatedCourses.map((relatedCourse) => (
            <Link
              className="course-related__item"
              key={relatedCourse.id}
              to={`/courses/${relatedCourse.id}`}
            >
              <span className="course-related__image">
                {relatedCourse.thumbnailUrl ? (
                  <img
                    alt={`${messageForUi("Ảnh khóa học ")}${relatedCourse.title}`}
                    src={relatedCourse.thumbnailUrl}
                  />
                ) : null}
              </span>
              <span>
                <strong>{relatedCourse.title}</strong>
                <small><SystemValue render={() => (formatCoursePrice(relatedCourse.price))} /></small>
              </span>
            </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
