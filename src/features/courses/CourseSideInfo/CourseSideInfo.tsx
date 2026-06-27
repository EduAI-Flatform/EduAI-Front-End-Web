import { Award, CheckCircle2, Circle, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { stitchCourseSamples } from "../course-list-samples";
import type { CourseDetailView } from "../course-detail.types";
import "./CourseSideInfo.css";

interface CourseSideInfoProps {
  course: CourseDetailView;
}

export function CourseSideInfo({ course }: CourseSideInfoProps) {
  const relatedCourses = stitchCourseSamples
    .filter((sample) => sample.id !== course.id)
    .slice(0, 2);

  return (
    <div className="course-detail-side">
      <section className="course-detail-card course-certificate-card">
        <div className="course-detail-card__heading">
          <Award aria-hidden="true" />
          <h3>Tiêu chí chứng chỉ</h3>
        </div>
        <ul className="course-certificate">
          <li>
            <CheckCircle2 aria-hidden="true" />
            Hoàn thành 100% khóa học
          </li>
          <li>
            <Circle aria-hidden="true" />
            Điểm quiz trung bình &gt; 70%
          </li>
        </ul>
        <div className="course-certificate-progress">
          <div>
            <span>Progress</span>
            <strong>33%</strong>
          </div>
          <div className="course-certificate-progress__bar">
            <span />
          </div>
        </div>
      </section>

      <section className="course-detail-card">
        <h3>Giảng viên</h3>
        <div className="course-instructor">
          {course.instructorAvatarUrl ? (
            <img alt="" src={course.instructorAvatarUrl} />
          ) : (
            <span className="course-instructor__avatar">
              <UserRound aria-hidden="true" />
            </span>
          )}
          <div>
            <h4>{course.instructorName ?? "Giảng viên EduAI"}</h4>
            <p>{course.instructorTitle ?? "Chuyên gia học tập số"}</p>
          </div>
        </div>
        <p className="course-instructor__bio">
          {course.instructorBio ??
            "Thông tin giảng viên sẽ được đồng bộ khi API mở trường hiển thị."}
        </p>
        <button className="course-instructor__button" type="button">
          View Profile
        </button>
      </section>

      <section className="course-related">
        <h3>Khóa học liên quan</h3>
        <div className="course-related__list">
          {relatedCourses.map((relatedCourse) => (
            <Link
              className="course-related__item"
              key={relatedCourse.id}
              to={`/courses/${relatedCourse.id}`}
            >
              <span className="course-related__image">
                {relatedCourse.thumbnailUrl ? (
                  <img alt="" src={relatedCourse.thumbnailUrl} />
                ) : null}
              </span>
              <span>
                <strong>{relatedCourse.title}</strong>
                <small>{relatedCourse.priceLabel ?? "Free"}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
