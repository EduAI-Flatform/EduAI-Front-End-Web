import { analyticsImage } from "../profilePageData";
import "./ProfileProgressSection.css";

export function ProfileProgressSection() {
  return (
    <section className="student-profile-card student-profile-progress">
      <div className="student-profile-card__header">
        <h2>Tiến độ học tập</h2>
      </div>
      <div className="student-profile-progress__image">
        <img alt="Bảng phân tích tiến độ học tập AI" src={analyticsImage} />
      </div>
    </section>
  );
}
