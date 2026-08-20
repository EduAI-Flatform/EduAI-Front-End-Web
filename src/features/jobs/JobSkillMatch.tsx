import { Link } from "react-router-dom";
import type { JobMatch } from "../../services/job.service";
import "./JobSkillMatch.css";

export function JobSkillMatch({ match }: { match: JobMatch }) {
  return <section className="job-match" aria-labelledby="job-match-title">
    <div className="job-match__score"><span>Độ phù hợp kỹ năng</span><strong>{match.fitScore}%</strong></div>
    <p id="job-match-title">{match.explanation}</p>
    <div className="job-match__columns">
      <div><h3>Kỹ năng đã khớp</h3>{match.matchedSkills.length ? <ul>{match.matchedSkills.map((skill) => <li key={skill.name}>{skill.name}{skill.learnerLevel ? ` · ${skill.learnerLevel}` : ""}</li>)}</ul> : <p>Chưa có kỹ năng trùng khớp.</p>}</div>
      <div><h3>Kỹ năng còn thiếu</h3>{match.missingSkills.length ? <ul>{match.missingSkills.map((skill) => <li key={skill.name}>{skill.name}{skill.reason === "level_gap" ? ` · ${skill.learnerLevel || "chưa đánh giá"} → ${skill.requiredLevel}` : skill.requiredLevel ? ` · cần ${skill.requiredLevel}` : ""}</li>)}</ul> : <p>Bạn đã có đủ các kỹ năng được liệt kê.</p>}</div>
    </div>
    {match.courseRecommendations.length ? <div className="job-match__courses"><h3>Khóa học gợi ý</h3>{match.courseRecommendations.map((course) => <Link aria-label={`Học ${course.title}`} key={course.id} to={`/courses/${course.id}`}><strong>{course.title}</strong><span>Bổ sung: {course.matchedMissingSkills.join(", ")}</span></Link>)}</div> : null}
  </section>;
}
